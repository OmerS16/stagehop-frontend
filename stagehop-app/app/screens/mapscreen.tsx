import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Pressable, Image,
  Animated, TouchableWithoutFeedback, FlatList
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  PanGestureHandlerGestureEvent,
  State
} from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

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
      logo: string; // ✅ logo URL
    };
  };
};

export default function MapScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const sheetHeight = Dimensions.get('window').height * 0.4;

  const translateY = useRef(new Animated.Value(sheetHeight + 100)).current;
  const listOpen = useRef(false);
  const mapRef = useRef<MapView>(null);
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
    fetch(`https://stagehop.app/events?date_from=${selectedDate}&limit=10&offset=0`)
      .then(res => res.json())
      .then(data => setEvents(data.features))
      .catch(err => console.error('Failed to fetch events:', err));
  }, [selectedDate]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      listOpen.current = true;
    });
  }, []);

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
        latitude: lat,
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
          {new Date(item.properties.date).toLocaleTimeString([], {
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
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        listOpen.current = true;
      });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleMapPress}>
        <View style={styles.container}>
        <View style={styles.dateSelector}>
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
        </View>
        <Text style={{ fontSize: 16, padding: 10 }}>Events: {events.length}</Text>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: 32.0853,
              longitude: 34.7818,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {events.map(event => (
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
            ))}
          </MapView>

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
                    {new Date(selectedEvent.properties.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </Text>
                  <Text style={styles.popupHint}>Swipe down to close</Text>
                </Pressable>
              </View>
            </PanGestureHandler>
          )}

          <Animated.View style={[styles.listContainer, { transform: [{ translateY }] }]}>
            <PanGestureHandler onHandlerStateChange={onHandlebarGestureEnd}>
              <View style={styles.handlebarWrapper}>
                <View style={styles.handlebar} />
              </View>
            </PanGestureHandler>

            <FlatList
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  markerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  popupWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  popupContent: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  popupSubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  popupTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  popupHint: {
    fontSize: 12,
    color: '#1e90ff',
    marginTop: 6,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  listContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height * 0.4,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    zIndex: 15,
    overflow: 'visible',
  },
  handlebarWrapper: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handlebar: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  listItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  listItemText: {
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemVenue: {
    fontSize: 12,
    color: '#555',
  },
  listItemTime: {
    fontSize: 12,
    color: '#777',
  },
  dateSelector: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButton: {
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  dateButtonSelected: {
    backgroundColor: '#1e90ff',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  dateTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
