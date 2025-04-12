import { StyleSheet, StatusBar, Dimensions } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
    backgroundColor: '#f5f5f5',
  },
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    marginRight: 10,
    paddingHorizontal: 16,
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

export default styles;
