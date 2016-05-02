import React from 'react';
import Backbone from 'backbone';
import { Offerings, Locations } from './models.js';
import { LocationInformation } from './locationInformation.js';
import { LocationForm } from './locationForm.js';
import { ReactSearch } from './search.js';

import '../scss/map.scss';
import '../scss/dialog.scss';
import '../scss/like_button.scss';
import '../scss/likes.scss';
import '../scss/popup.scss';
import '../scss/button.scss';

var ThanksDialog = React.createClass({
    render: function() {
        return (
            <div className="Dialog">
                <div className="Dialog-inner js-content">
                    <div className="Dialog-content">
                        <div className="Dialog-logo"></div>
                        <div className="Dialog-message">{this.props.title}</div>
                        <p>{this.props.text}</p>
                    </div>
                    <footer className="Footer">
                        <button className="Button js-ok"
                                onClick={this.props.onClickOk}>
                            {this.props.ok_button}
                        </button>
                    </footer>
                    <button className="Button Button--close js-cancel"
                            onClick={this.props.onClickClose}>✕</button>
                </div>
            </div>
        )
    }
});

const Popup = L.Popup.extend({
  initialize: function (options, source) {
    this.options.className = 'Popup';
    L.setOptions(this, options);
        this._source = source;
  }
});

const SL = {
    Popup: function(options) {
        return new Popup(options);
    }
};

module.exports.ReactMap = React.createClass({

    getInitialState() {
        const model = new Backbone.Model({
            marker: null
        });

        const geocoder = new google.maps.Geocoder();

        const offerings = new Offerings();
        offerings.fetch();

        return {
            model: model,
            geocoder: geocoder,
            offerings: offerings,
            locationForm: false,
            thanksDialog: false,
            viz: {
                templateURL: '//<%- username %>.cartodb.com/api/v2/viz/<%-id %>/viz.json'
            },
            mapOptions: {
                center: [40.74442, -73.970],
                zoom: 13,
                https: true,
                zoomControl: true,
                scrollwheel: true,
                loaderControl: true,
                search: false,
                shareable: false
            },
            style: {
                marker: {
                    radius: 7,
                    fillColor: '#F05658',
                    color: '#FFFFFF',
                    weight: 1.5,
                    opacity: 0.9,
                    fillOpacity: 1
                }
            }
        }
    },

    componentDidMount() {
        var url = this._getVizJSONURL();
        var options = this.state.mapOptions;

        cartodb.createVis('map', url, options).done(this._onVisLoaded);
    },

    isMobile() {
        if( navigator.userAgent.match(/Android/i)
         || navigator.userAgent.match(/webOS/i)
         || navigator.userAgent.match(/iPhone/i)
         || navigator.userAgent.match(/iPad/i)
         || navigator.userAgent.match(/iPod/i)
         || navigator.userAgent.match(/BlackBerry/i)
         || navigator.userAgent.match(/Windows Phone/i)
         ){
            return true;
          }
         else {
            return false;
          }
    },

    _onVisLoaded(vis, layers) {
        var layer = layers[1];
        layer.setInteraction(true);
        var query = "SELECT l.*, string_agg(o.name, ', ') as offerings " +
            "FROM locations AS l " +
            "LEFT OUTER JOIN locations_offerings AS lo ON lo.location_id = l.cartodb_id " +
            "LEFT OUTER JOIN offerings as o ON o.cartodb_id = lo.offering_id " +
            "GROUP BY l.cartodb_id";
        layer.setQuery(query);

        layer.on('mouseover',    this._onMouseOver);
        layer.on('mouseout',     this._onMouseOut);
        layer.on('featureClick', this._onFeatureClick);

        var sublayer = layer.getSubLayer(0);
        sublayer.setInteraction(true);
        sublayer.setInteractivity('cartodb_id, name, description, offerings, address');

        var markerWidth = this.isMobile() ? 20 : 10;
        var locationCSS = '#locations {' + 
             'marker-fill-opacity: 0.9;' +
             'marker-line-color: #FFF;' +
             'marker-line-width: 1;' +
             'marker-line-opacity: 1;' +
             'marker-placement: point;' +
             'marker-type: ellipse;' +
             'marker-width: ' + markerWidth + ';' +
             'marker-fill: #FF6600;' +
             'marker-allow-overlap: true; }';

        sublayer.setCartoCSS(locationCSS);

        //TODO: fix this
        sublayer.on('featureClick', function(e, latlng, pos, data) {
            e.preventDefault();
            e.stopPropagation();
        });

        this.map = vis.getNativeMap();

        this.map.on('click', this._onClickMap);
    },

    _onMouseOut: function() {
        $('.leaflet-container').css('cursor', 'auto');
    },

    _onMouseOver: function() {
        $('.leaflet-container').css('cursor', 'pointer');
    },

    _onFeatureClick: function(e, latlng, pos, data) {
        e.preventDefault();
        e.stopPropagation();

        if (this.t) {
            clearTimeout(this.t);
        }

        this.map.closePopup();

        this.setState({
            locationInformation: data
        })
    },


    _onClickMap: function(e) {
        var geocoder = this.state.geocoder;
        var _onFinishedGeocoding = this._onFinishedGeocoding;
        this.t = setTimeout(function()  {
            var coordinates = [e.latlng.lat, e.latlng.lng];
            var latLng = new google.maps.LatLng(coordinates[0], coordinates[1]);

            geocoder.geocode({ 'latLng': latLng }, function(results, status) {
                _onFinishedGeocoding(coordinates, null, results, status);
            });
        }, 250);
    },

    _onFinishedGeocoding: function(coordinates, place, results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results && results.length > 0) {
                var address = results[0].formatted_address;
                var name = place ? place.name : null;
                this.state.model.set({ name: name, coordinates: coordinates, address: address });
                this._addMarker(coordinates);
            }
        }
    },

    _addMarker: function(coordinates) {
        var style = this.state.style.marker;
        var name = this.state.model.get('name');
        var nameString = name ? name + ', ' : '';
        var address = this.state.model.get('address');

        var content =
            '<p>' +
              '<strong class="Popup-addressName">' +
                 nameString + address +
              '</strong>' +
              '<br/>' +
              'is not part of Streetlives yet. ' +
              'Do you want to add this location to the map?' +
            '</p>' +
            '<button class="Button Button--addLocationSmall js-add-location">' +
              'Add location' +
            '</button>';

        var panCoords = (this.isMobile()) ? [0, 150] : [10, 75];
        this.popup = SL.Popup({ autoPanPaddingTopLeft: panCoords, offset: [0, -5] })
            .setLatLng(coordinates)
            .setContent(content)
            .openOn(this.map);

        var self = this;

        this.popup.on('close', function() {
            self.map.removeLayer(self.currentMarker);
        });

        this.currentMarker = L.circleMarker(coordinates, style);
        this.currentMarker.addTo(this.map);

        /**
         * This element is INSIDE the content of the popup generated from the template. No better
         * ideas on how to attach the handler to it. Hopefully React/leaflet thing can help here.
         */
        $('.js-add-location').click(this._onClickAddLocation);
    },

    _onClickAddLocation: function(e) {
        this._killEvent(e);
        this.map.removeLayer(this.popup);

        this.setState({
            locationForm: true
        });
        console.log(this.state);
    },

    _killEvent: function(e) {
        if (e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            if (e.stopPropagation) {
                e.stopPropagation();
            }
        }
    },

    _onKeyUp: function(e) {
        if (e.keyCode === 27) {
            this.map.closePopup();
        }
    },

    _onAddLocation: function() {
        var marker = L.circleMarker(this.state.model.get('coordinates'), this.state.style.marker);

        marker.on('click', function() {
            console.log('click');
        });

        marker.addTo(this.map);

        this.setState({
            thanksDialog: true
        });

        this._removeCurrentSelection();
    },

    _removeCurrentSelection: function() {
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
            this.state.model.set({ address: null });
            this.setState({
                locationForm: false
            });
        }
    },

    _reconcileCoordinates(coordinates) {
        var locationModel = new Locations();
        var self = this;
        locationModel.fetch({data: $.param({ address: coordinates})}).done(function(data) {
            if (data.rows.length > 0) {
                self.setState({
                    locationInformation: data.rows[0]
                })
            } else {
                self._addMarker(coordinates);
            }
        });
    },

    _gotoPlace: function(place) {
        var coordinates = [place.geometry.location.lat(), place.geometry.location.lng()];
        var latLng = new google.maps.LatLng(coordinates[0], coordinates[1]);

        var self = this;
        this.map.panTo(coordinates);

        var model = this.state.model;
        setTimeout(function() {
            model.set({
                name: place.name,
                address: place.formatted_address
            });
            self._reconcileCoordinates(coordinates);
        }, 500);
    },

    _getVizJSONURL() {
        var tpl = _.template(this.state.viz.templateURL);

        return tpl({
            id: window.Config.map_id,
            username: window.Config.username
        });
    },

    removeLocationForm() {
        this.setState({
            locationForm: false
        })
    },

    removeLocationInformation(addedNewComment) {
        this.setState({
            locationInformation: null,
            thanksDialog: typeof(addedNewcomment) === 'boolean' ? addedNewComment : false
        })
    },

    renderLocationInformation() {
        if (this.state.locationInformation) {
            return (
                <LocationInformation options={this.state.locationInformation}
                                     onClickClose={this.removeLocationInformation} />
            )
        }
    },

    renderLocationForm() {
      if (this.state.locationForm) {
          return (
              <LocationForm onAddLocation={this._onAddLocation}
                            onClickCancel={this.removeLocationForm}
                            offerings={this.state.offerings}
                            name={this.state.model.get('name')}
                            coordinates={this.state.model.get('coordinates')}
                            address={this.state.model.get('address')}
              />
          )
      } else {
          return null;
      }
    },

    removeThanksDialog() {
        this.setState({
            thanksDialog: false
        })
    },

    renderThanksDialog() {
        if (this.state.thanksDialog) {
            return (
                <ThanksDialog onClickOk={this.removeThanksDialog}
                              onClickClose={this.removeThanksDialog}
                              title='Thank your for helping the community with your knowledge'
                              text=''
                              ok_button='Ok, thanks'/>
            )
        } else {
            return null;
        }
    },

    render() {
        return (
            <div onkeyup={this._onKeyUp}>
                <div id="map" className="Map"></div>
                <ReactSearch gotoPlace={this._gotoPlace}/>
                {this.renderLocationForm()}
                {this.renderLocationInformation()}
                {this.renderThanksDialog()}
            </div>
        )
    }

});