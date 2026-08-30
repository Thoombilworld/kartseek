import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../../domain/entities/entities.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/services/geocoding_service.dart';
import 'package:shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
class DestinationSearchScreen extends StatefulWidget {
  final String? initialSearchType;

  const DestinationSearchScreen({super.key, this.initialSearchType});

  @override
  State<DestinationSearchScreen> createState() => _DestinationSearchScreenState();
}

class _DestinationSearchScreenState extends State<DestinationSearchScreen> {
  final TextEditingController _pickupController = TextEditingController(text: 'Current Location');
  final TextEditingController _dropoffController = TextEditingController();

  List<PlaceSuggestion> _suggestions = [];
  bool _isLoading = false;
  bool _hasSearchError = false;
  Timer? _searchTimeout;

  @override
  void initState() {
    super.initState();
    // Auto-set pickup from BookingBloc or GPS if not already set
    final bloc = context.read<BookingBloc>();
    if (bloc.state.pickup == null) {
      final region = RegionService.instance;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
      bloc.add(SetPickupLocation(
        GeoLocation(lat: lat, lng: lng, address: 'Current Location'),
      ));
    } else {
      _pickupController.text = bloc.state.pickup!.address ?? 'Current Location';
    }

    _dropoffController.addListener(_onDropoffChanged);
  }

  void _onDropoffChanged() {
    final query = _dropoffController.text;
    if (query.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _isLoading = false;
        _hasSearchError = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _hasSearchError = false;
    });

    // Cancel any existing search timeout
    _searchTimeout?.cancel();

    // Set a 10-second timeout for the search
    _searchTimeout = Timer(const Duration(seconds: 10), () {
      if (mounted && _isLoading) {
        setState(() {
          _isLoading = false;
          _hasSearchError = true;
        });
      }
    });

    final region = RegionService.instance;
    final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
    final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;

    try {
      GeocodingService.instance.autocompleteDebounced(
        query,
        lat: lat,
        lng: lng,
        onResult: (suggestions) {
          _searchTimeout?.cancel();
          if (mounted) {
            setState(() {
              _suggestions = suggestions;
              _isLoading = false;
              _hasSearchError = false;
            });
          }
        },
      );
    } catch (e) {
      _searchTimeout?.cancel();
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasSearchError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchTimeout?.cancel();
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Plan your trip',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Input Fields Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 4,
                  offset: Offset(0, 2),
                )
              ],
            ),
            child: Row(
              children: [
                // Timeline Graphics
                Column(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Container(
                      width: 2,
                      height: 40,
                      color: Colors.black26,
                    ),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                // Text Fields
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: TextField(
                          controller: _pickupController,
                          scrollPhysics: const BouncingScrollPhysics(),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            hintText: 'Pickup Location',
                          ),
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: TextField(
                          controller: _dropoffController,
                          autofocus: true,
                          scrollPhysics: const BouncingScrollPhysics(),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            hintText: 'Where to?',
                          ),
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.mic_none_rounded, color: Colors.black87, size: 22),
                  onPressed: () => VoiceSearchSheet.show(
                    context: context,
                    accentColor: AppTheme.taxiColor,
                    hintText: 'Try "airport" or "city center"',
                    onResult: (text) {
                      _dropoffController.text = text;
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add, color: Colors.black),
                  tooltip: 'Add stop',
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Set your destination first, then add stops from the trip plan')),
                    );
                  },
                ),
              ],
            ),
          ),
          // Suggested Locations
          if (_isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_hasSearchError)
            Expanded(
              child: Column(
                children: [
                  const SizedBox(height: 32),
                  Icon(Icons.cloud_off_rounded, size: 40, color: Colors.grey[400]),
                  const SizedBox(height: 12),
                  Text(
                    'Search service unavailable',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Try again or select from popular destinations below',
                    style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                  ),
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: _onDropoffChanged,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Retry'),
                  ),
                  const Divider(height: 24),
                  // Show popular destinations as fallback
                  ..._buildRegionFallbacks(),
                ],
              ),
            )
          else if (_suggestions.isNotEmpty)
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                itemCount: _suggestions.length,
                itemBuilder: (context, index) {
                  final suggestion = _suggestions[index];
                  return _LocationTile(
                    icon: Icons.location_on,
                    title: suggestion.mainText,
                    subtitle: suggestion.secondaryText,
                    onTap: () => _onSuggestionTapped(suggestion),
                  );
                },
              ),
            )
          else if (_dropoffController.text.trim().isNotEmpty)
            // User typed something but no results found
            Expanded(
              child: ListView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                children: [
                  const SizedBox(height: 24),
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.search_off_rounded, size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        Text(
                          'No locations found',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Try a different search term or set location on map',
                          style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                        ),
                        const SizedBox(height: 16),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushNamed('/taxi/pickup-confirm');
                          },
                          icon: const Icon(Icons.map_rounded, size: 18),
                          label: const Text('Pick on map'),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 32),
                  // Show popular destinations as fallback
                  ..._buildRegionFallbacks(),
                ],
              ),
            )
          else
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                children: [
                  _LocationTile(
                    icon: Icons.star,
                    title: 'Saved Places',
                    onTap: () {
                      Navigator.of(context).pushNamed('/taxi/saved-places');
                    },
                  ),
                _LocationTile(
                  icon: Icons.location_on,
                  title: 'Set location on map',
                  onTap: () {
                    Navigator.of(context).pushNamed('/taxi/pickup-confirm');
                  },
                ),
                const Divider(),
                // Region-appropriate popular destinations
                ..._buildRegionFallbacks(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _selectDestination(BuildContext context, GeoLocation destination) {
    context.read<BookingBloc>().add(SetDestination(destination));
    Navigator.of(context).pushNamed('/taxi/vehicles');
  }

  Future<void> _onSuggestionTapped(PlaceSuggestion suggestion) async {
    setState(() => _isLoading = true);

    final detail = await GeocodingService.instance.getPlaceDetails(suggestion.placeId);
    
    if (mounted) {
      setState(() => _isLoading = false);
      if (detail != null) {
        _selectDestination(
          context,
          GeoLocation(
            lat: detail.lat,
            lng: detail.lng,
            address: detail.formattedAddress.isNotEmpty ? detail.formattedAddress : suggestion.mainText,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load location details.')),
        );
      }
    }
  }

  /// Build region-appropriate popular destination tiles based on RegionService.
  List<Widget> _buildRegionFallbacks() {
    final region = RegionService.instance.currentCountry;
    
    // Popular destinations per region
    final destinations = switch (region.code) {
      'KE' => [
        ('Jomo Kenyatta Airport', 'Nairobi, Kenya', -1.3192, 36.9278),
        ('Westlands', 'Nairobi, Kenya', -1.2674, 36.8110),
        ('The Hub Karen', 'Karen, Nairobi', -1.3225, 36.7120),
      ],
      'QA' => [
        ('Hamad International Airport', 'Doha, Qatar', 25.2609, 51.6138),
        ('The Pearl Qatar', 'Doha, Qatar', 25.3720, 51.5510),
        ('Souq Waqif', 'Doha, Qatar', 25.2867, 51.5333),
      ],
      'AE' => [
        ('Dubai International Airport', 'Dubai, UAE', 25.2532, 55.3657),
        ('Dubai Mall', 'Downtown Dubai', 25.1972, 55.2744),
        ('Abu Dhabi Corniche', 'Abu Dhabi, UAE', 24.4764, 54.3467),
      ],
      _ => [
        ('${region.defaultCity} City Center', region.name, region.defaultLat, region.defaultLng),
        ('${region.defaultCity} Airport', region.name, region.defaultLat + 0.05, region.defaultLng + 0.03),
      ],
    };

    return destinations.map((dest) {
      final (title, subtitle, lat, lng) = dest;
      return _LocationTile(
        icon: Icons.place_rounded,
        title: title,
        subtitle: subtitle,
        onTap: () => _selectDestination(
          context,
          GeoLocation(lat: lat, lng: lng, address: title),
        ),
      );
    }).toList();
  }
}

class _LocationTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _LocationTile({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.black87, size: 20),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black87),
      ),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      onTap: onTap,
    );
  }
}
