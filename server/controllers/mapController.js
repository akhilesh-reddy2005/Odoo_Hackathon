const mapsService = require('../services/maps.service');

exports.getDirections = async (req, res) => {
  const { origin, destination, alternatives } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ message: 'Origin and destination are required parameters.' });
  }

  try {
    const isAlternatives = alternatives === 'true';
    const routes = await mapsService.getDirections(origin, destination, isAlternatives);
    res.json(routes);
  } catch (error) {
    console.error('Error fetching directions:', error.message);
    res.status(500).json({ message: 'Failed to retrieve directions from OpenRouteService.', error: error.message });
  }
};

exports.geocodeAddress = async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ message: 'Address is a required parameter.' });
  }

  try {
    const result = await mapsService.geocodeAddress(address);
    res.json(result);
  } catch (error) {
    console.error('Error geocoding address:', error.message);
    res.status(500).json({ message: 'Failed to geocode address via OpenRouteService.', error: error.message });
  }
};

exports.autocompleteAddress = async (req, res) => {
  const { text } = req.query;

  if (!text || text.trim().length < 2) {
    return res.json([]);
  }

  try {
    const suggestions = await mapsService.autocompleteAddress(text.trim());
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error.message);
    res.status(500).json({ message: 'Failed to fetch address suggestions.', error: error.message });
  }
};
