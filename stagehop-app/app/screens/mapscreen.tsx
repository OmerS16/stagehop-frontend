import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, Dimensions, Pressable, Image, Animated, TouchableWithoutFeedback, FlatList, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { PanGestureHandler, GestureHandlerRootView, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import styles from './styles';

type Event = {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: number;
    show_name: string;
    date: string;
    link: string;
    img: string;
    venue: {
      id: number;
      name: string;
      logo: string;
    };
  };
};

export default function MapScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);

  const sheetHeight = Dimensions.get('window').height * 0.25;
  const screenHeight = Dimensions.get('window').height;
  const filterHeight = 60

  const CLOSED_POSITION = sheetHeight;
  const OPEN_POSITION = 0;

  const translateY = useRef(new Animated.Value(CLOSED_POSITION)).current;
  const listOpen = useRef(false);
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  type CachedEntry = {
    data: Event[];
    timestamp: number;
  };
  const cacheRef = useRef<Record<string, CachedEntry>>({});

  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: d.toISOString().split('T')[0] + 'T00:00:00',
    };
  });
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
  
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading ?? 0,
          });
        }
      );
    })();
  }, []);

  const openGoogleMapsDirections = (venueLat: number, venueLng: number) => {
    if (!userLocation) return;
  
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${venueLat},${venueLng}&travelmode=walking`;
    Linking.openURL(url);
  };

  useEffect(() => {
    mapRef.current?.animateCamera({
      center: {
        latitude: 32.0510,
        longitude: 34.7706,
      },
      pitch: 0,
      heading: 0,
      altitude: 500,
      zoom: 13,
    }, { duration: 1000});
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const now = Date.now();
      const cached = cacheRef.current[selectedDate];
      const cacheDuration = 60 * 60 * 1000;

      if (cached && now - cached.timestamp < cacheDuration) {
        setEvents(cached.data);
        return;
      }

      try {
        setLoading(true);
  
        const res = await fetch(`https://stagehop.app/events?date_from=${selectedDate}&limit=10&offset=0`);
        if (!res.ok) {
          const text = await res.text();
          console.error('Server error:', res.status, text);
          return;
        }
  
        const data = await res.json();
        cacheRef.current[selectedDate] = {
          data: data.features,
          timestamp: now,
        };
        setEvents(data.features);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
  
    fetchEvents();
  }, [selectedDate]);

  useEffect(() => {
    if (events.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [events]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: OPEN_POSITION,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      listOpen.current = true;
    });
  }, [])

  const handleMapPress = () => {
    if (selectedEvent) {
      setSelectedEvent(null);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        listOpen.current = true;
      });
    }
  };

  const handleCardPress = () => {
    if (selectedEvent?.properties.link) {
      Linking.openURL(selectedEvent.properties.link);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    Animated.timing(translateY, {
      toValue: sheetHeight + 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      listOpen.current = false;
    });

    const [lng, lat] = event.geometry.coordinates;
    mapRef.current?.animateToRegion(
      {
        latitude: lat - 0.005,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500
    );
  };

  const renderListItem = ({ item }: { item: Event }) => (
    <Pressable style={styles.listItem} onPress={() => handleEventSelect(item)}>
      <Image source={{ uri: item.properties.img }} style={styles.listItemImage} />
      <View style={styles.listItemText}>
        <Text style={styles.listItemTitle}>{item.properties.show_name}</Text>
        <Text style={styles.listItemVenue}>{item.properties.venue.name}</Text>
        <Text style={styles.listItemTime}>
          {new Date(item.properties.date).toLocaleString([], {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </Text>
      </View>
    </Pressable>
  );

  const onHandlebarGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, velocityY } = event.nativeEvent;

    if (event.nativeEvent.state === State.END) {
      if (translationY > 100 && velocityY > 200) {
        Animated.timing(translateY, {
          toValue: sheetHeight + 100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          listOpen.current = false;
        });
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          listOpen.current = true;
        });
      }
    }
  };

  const onPopupSwipeEnd = (event: PanGestureHandlerGestureEvent) => {
    const dy = event.nativeEvent.translationY;
    const vy = event.nativeEvent.velocityY;

    if (dy > 50 && vy > 200) {
      setSelectedEvent(null);
      Animated.timing(translateY, {
        toValue: OPEN_POSITION,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        listOpen.current = false;
      });
    }
  };

  const renderedUserMarker = useMemo(() => {
    if (!userLocation) return null;
  
    return (
      <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#4285F4',
              borderColor: '#fff',
              borderWidth: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          />
        </View>
      </Marker>
    );
  }, [userLocation]);

  const renderedMarkers = useMemo(() => (
    events.map(event => (
      <Marker
        key={event.properties.id}
        coordinate={{
          latitude: event.geometry.coordinates[1],
          longitude: event.geometry.coordinates[0],
        }}
        onPress={() => handleEventSelect(event)}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.markerCircle}>
          <Image
            source={{ uri: event.properties.venue.logo }}
            style={styles.markerLogo}
            resizeMode="cover"
          />
        </View>
      </Marker>
    ))
  ), [events]);
  

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleMapPress}>
        <View style={styles.container}>
          <View style={styles.dateScrollWrapper}>
            <Text style={styles.arrow}>‹</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelector}
                style={{ height: filterHeight }}
              >
                {dateOptions.map(option => (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedDate(option.value)}
                    style={[
                      styles.dateButton,
                      selectedDate === option.value && styles.dateButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        selectedDate === option.value && styles.dateTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.arrow}>›</Text>
            </View>
          <View style={{ height: screenHeight - filterHeight }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: 32.06081,
                longitude: 34.77303,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {renderedUserMarker}
              {renderedMarkers}
            </MapView>
          </View>
          {selectedEvent && (
            <PanGestureHandler onHandlerStateChange={onPopupSwipeEnd}>
              <View style={styles.popupWrapper}>
                <Pressable onPress={handleCardPress} style={styles.popupContent}>
                  {!!selectedEvent.properties.img && (
                    <Image source={{ uri: selectedEvent.properties.img }} style={styles.image} resizeMode="cover" />
                  )}
                  <Text style={styles.popupTitle}>{selectedEvent.properties.show_name}</Text>
                  <Text style={styles.popupSubtitle}>{selectedEvent.properties.venue.name}</Text>
                  <Text style={styles.popupTime}>
                    {new Date(selectedEvent.properties.date).toLocaleString([], {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </Text>
                  <Text style={styles.popupHint}>Swipe down to close</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    openGoogleMapsDirections(
                      selectedEvent.geometry.coordinates[1],
                      selectedEvent.geometry.coordinates[0]
                    )
                  }
                  style={styles.directionsButton}
                >
                  <Text style={styles.directionsText}>Directions</Text>
                </Pressable>
              </View>
            </PanGestureHandler>
          )}
          <PanGestureHandler onHandlerStateChange={onHandlebarGestureEnd}>
            <Animated.View
              style={[
                styles.handlebarWrapper,
                {
                  transform: [{ translateY }],
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: screenHeight - (sheetHeight + 100),
                  zIndex: 15,
                  alignItems: 'center',
                },
              ]}
            >
              <View style={styles.handlebar} />
            </Animated.View>
          </PanGestureHandler>
          <Animated.View style={[styles.listContainer, { height: screenHeight * 0.25 + 100 }, { transform: [{ translateY }] }]}>
          {loading && (
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'white',
              zIndex: 99,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Animated.View>
                <ActivityIndicator size="large" color="#4285F4" />
              </Animated.View>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={events}
            keyExtractor={item => item.properties.id.toString()}
            renderItem={renderListItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}
