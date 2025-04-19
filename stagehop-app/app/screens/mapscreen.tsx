import { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Dimensions,
  Pressable,
  Image,
  Animated,
  TouchableWithoutFeedback,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
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
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);

  const sheetHeight = Dimensions.get('window').height * 0.25;
  const screenHeight = Dimensions.get('window').height;
  const filterHeight = 60;

  const CLOSED_POSITION = sheetHeight;
  const OPEN_POSITION = 0;

  const translateY = useRef(new Animated.Value(CLOSED_POSITION)).current;
  const listOpen = useRef(false);
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);
  const verticalSwipeRef = useRef<PanGestureHandler>(null);
  const horizontalSwipeRef = useRef<PanGestureHandler>(null);
  const handlebarRef = useRef<PanGestureHandler>(null);

  // Prevent map taps right after a marker tap
  const ignoreMapPress = useRef(false);

  // Filter shows at this venue on the same day
  const showsForVenue = useMemo(() => {
    if (!selectedEvent) return [];
    const selectedDay = selectedEvent.properties.date.split('T')[0];
    return events.filter(
      (e) =>
        e.properties.venue.id === selectedEvent.properties.venue.id &&
        e.properties.date.split('T')[0] === selectedDay
    );
  }, [events, selectedEvent]);

  // Date selector setup
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

  // Watch user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
        (loc) =>
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading ?? 0,
          })
      );
    })();
  }, []);

  const openGoogleMapsDirections = (lat: number, lng: number) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${lat},${lng}&travelmode=walking`;
    Linking.openURL(url);
  };

  // Center map on mount
  useEffect(() => {
    mapRef.current?.animateCamera(
      { center: { latitude: 32.051, longitude: 34.7706 }, pitch: 0, heading: 0, altitude: 500, zoom: 13 },
      { duration: 1000 }
    );
  }, []);

  // Fetch events
  useEffect(() => {
    const cache: Record<string, { data: Event[]; ts: number }> = {};
    const fetchEvents = async () => {
      const now = Date.now();
      if (cache[selectedDate] && now - cache[selectedDate].ts < 3600_000) {
        setEvents(cache[selectedDate].data);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `https://stagehop.app/events?date_from=${selectedDate}&limit=10&offset=0`
        );
        const json = await res.json();
        cache[selectedDate] = { data: json.features, ts: now };
        setEvents(json.features);
      } catch {}
      setTimeout(() => setLoading(false), 300);
    };
    fetchEvents();
  }, [selectedDate]);

  // Reset list scroll on new data
  useEffect(() => {
    if (events.length) flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [events]);

  // Initially open list
  useEffect(() => {
    Animated.timing(translateY, { toValue: OPEN_POSITION, duration: 300, useNativeDriver: true }).start(() => {
      listOpen.current = true;
    });
  }, []);

  // Map background tap
  const handleMapPress = () => {
    if (ignoreMapPress.current) {
      ignoreMapPress.current = false;
      return;
    }
    if (selectedEvent) {
      setSelectedEvent(null);
      Animated.timing(translateY, { toValue: OPEN_POSITION, duration: 300, useNativeDriver: true }).start(() => {
        listOpen.current = true;
      });
    }
  };

  const handleCardPress = () => {
    if (selectedEvent?.properties.link) {
      Linking.openURL(selectedEvent.properties.link);
    }
  };

  // Select a marker
  const handleEventSelect = (event: Event) => {
    const day = event.properties.date.split('T')[0];
    const list = events.filter(
      e =>
        e.properties.venue.id === event.properties.venue.id &&
        e.properties.date.split('T')[0] === day
    );
    const idx = list.findIndex(e => e.properties.id === event.properties.id);
    setCurrentShowIndex(idx >= 0 ? idx : 0);
  
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
      { latitude: lat - 0.005, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      500
    );
  };

  const onPopupSwipeHorizontal = (e: PanGestureHandlerGestureEvent) => {
    if (e.nativeEvent.state !== State.END) return;
    const { translationX, velocityX } = e.nativeEvent;
    const len = showsForVenue.length;
    if (len < 2) return;
  
    // swipe left → next (with wrap‑around)
    if (translationX < -50 && velocityX < -200) {
      const next = (currentShowIndex + 1) % len;
      setCurrentShowIndex(next);
      setSelectedEvent(showsForVenue[next]);
    }
    // swipe right → previous (with wrap‑around)
    else if (translationX > 50 && velocityX > 200) {
      const prev = (currentShowIndex - 1 + len) % len;
      setCurrentShowIndex(prev);
      setSelectedEvent(showsForVenue[prev]);
    }
  };

  // Handlebar swipe
  const onHandlebarGestureEnd = (e: PanGestureHandlerGestureEvent) => {
    const { translationY, velocityY } = e.nativeEvent;
    if (e.nativeEvent.state === State.END) {
      if (translationY > 100 && velocityY > 200) {
        Animated.timing(translateY, { toValue: sheetHeight + 100, duration: 300, useNativeDriver: true }).start(() => {
          listOpen.current = false;
        });
      } else {
        Animated.timing(translateY, { toValue: OPEN_POSITION, duration: 300, useNativeDriver: true }).start(() => {
          listOpen.current = true;
        });
      }
    }
  };

  // Popup swipe-down to close
  const onPopupSwipeEnd = (e: PanGestureHandlerGestureEvent) => {
    const { translationY, velocityY } = e.nativeEvent;
    if (translationY > 50 && velocityY > 200) {
      setSelectedEvent(null);
      Animated.timing(translateY, { toValue: OPEN_POSITION, duration: 300, useNativeDriver: true }).start(() => {
        listOpen.current = true;
      });
    }
  };

  // Render markers
  const renderedMarkers = useMemo(
    () =>
      events.map((event) => (
        <Marker
          key={event.properties.id}
          coordinate={{
            latitude: event.geometry.coordinates[1],
            longitude: event.geometry.coordinates[0],
          }}
          onPress={() => {
            ignoreMapPress.current = true;
            handleEventSelect(event);
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.markerCircle}>
            <Image source={{ uri: event.properties.venue.logo }} style={styles.markerLogo} />
          </View>
        </Marker>
      )),
    [events]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleMapPress}>
        <View style={styles.container}>
          {/* Date selector */}
          <View style={styles.dateScrollWrapper}>
            <Text style={styles.arrow}>‹</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelector} style={{ height: filterHeight }}>
              {dateOptions.map((opt) => (
                <Pressable key={opt.value} onPress={() => setSelectedDate(opt.value)} style={[styles.dateButton, selectedDate === opt.value && styles.dateButtonSelected]}>
                  <Text style={[styles.dateText, selectedDate === opt.value && styles.dateTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.arrow}>›</Text>
          </View>

          {/* Map */}
          <View style={{ height: screenHeight - filterHeight }}>
            <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={{ latitude: 32.06081, longitude: 34.77303, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
              {userLocation && (
                <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4285F4', borderColor: '#fff', borderWidth: 3, elevation: 5 }} />
                  </View>
                </Marker>
              )}
              {renderedMarkers}
            </MapView>
          </View>

          {selectedEvent && (
            <PanGestureHandler
              ref={verticalSwipeRef}
              onHandlerStateChange={onPopupSwipeEnd}
              activeOffsetY={[-10, 10]}
              activeOffsetX={[-1000, 1000]}
              simultaneousHandlers={[horizontalSwipeRef, handlebarRef]}
            >
              <View style={styles.popupWrapper}>
                {/* arrows */}
                {showsForVenue.length > 1 && <Text style={styles.arrowIndicatorLeft}>‹</Text>}
                {showsForVenue.length > 1 && <Text style={styles.arrowIndicatorRight}>›</Text>}

                <PanGestureHandler
                  ref={horizontalSwipeRef}
                  onHandlerStateChange={onPopupSwipeHorizontal}
                  activeOffsetX={[-10, 10]}
                  activeOffsetY={[-1000, 1000]}
                  simultaneousHandlers={[verticalSwipeRef]}
                >
                  <Pressable onPress={handleCardPress} style={styles.popupContent}>
                    {!!showsForVenue[currentShowIndex]?.properties.img && (
                      <Image
                        source={{ uri: showsForVenue[currentShowIndex].properties.img }}
                        style={styles.image}
                      />
                    )}
                    <Text style={styles.popupTitle}>
                      {showsForVenue[currentShowIndex].properties.show_name}
                    </Text>
                    <Text style={styles.popupSubtitle}>
                      {showsForVenue[currentShowIndex].properties.venue.name}
                    </Text>
                    <Text style={styles.popupTime}>
                      {new Date(showsForVenue[currentShowIndex].properties.date).toLocaleString(
                        [],
                        {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }
                      )}
                    </Text>
                    <Text style={styles.popupHint}>Swipe down to close</Text>
                  </Pressable>
                </PanGestureHandler>

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

          {/* Handlebar */}
          <PanGestureHandler
            ref={handlebarRef}
            onHandlerStateChange={onHandlebarGestureEnd}
            activeOffsetY={[-10, 10]}
            activeOffsetX={[-1000, 1000]}
            simultaneousHandlers={[verticalSwipeRef, horizontalSwipeRef]}
          >
            <Animated.View
              style={[
                styles.handlebarWrapper,
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: screenHeight - (sheetHeight + 100),
                  zIndex: 20,
                  alignItems: 'center',
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.handlebar} />
            </Animated.View>
          </PanGestureHandler>

          {/* Bottom Sheet List */}
          <Animated.View style={[styles.listContainer, { height: sheetHeight + 100, transform: [{ translateY }] }]}>
            {loading && (
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4285F4" />
              </View>
            )}
            <FlatList ref={flatListRef} data={events} keyExtractor={(i) => i.properties.id.toString()} renderItem={({ item }) => (
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
            )} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}