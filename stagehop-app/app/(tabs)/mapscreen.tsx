import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

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
    };
  };
};

export default function MapScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetch('https://stagehop.app/events/today')
      .then(res => res.json())
      .then(data => setEvents(data.features))
      .catch(err => console.error('Failed to fetch events:', err));
  }, []);

  const handleMapPress = () => {
    if (selectedEvent) setSelectedEvent(null);
  };

  return (
    <TouchableWithoutFeedback onPress={handleMapPress}>
      <View style={styles.container}>
        <MapView
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
              onPress={() => setSelectedEvent(event)}
            />
          ))}
        </MapView>

        {selectedEvent && (
          <View style={styles.popup}>
            <Image
              source={{ uri: selectedEvent.properties.img }}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.popupTitle}>{selectedEvent.properties.show_name}</Text>
            <Text style={styles.popupSubtitle}>{selectedEvent.properties.venue.name}</Text>
            <Text style={styles.popupTime}>
              {new Date(selectedEvent.properties.date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false, // ✅ 24h format
              })}
            </Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  popup: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
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
  image: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
});
