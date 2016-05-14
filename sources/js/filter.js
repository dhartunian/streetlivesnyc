'use strict';

import React from 'react';
import { Link } from 'react-router';

import { Offerings, Locations } from './models.js';

import '../scss/filter.scss';

module.exports.Filter = React.createClass({

  getDefaultProps: function() {
    return {
      filterOfferings: [
        {
          cartoId:'4', 
          css: 'lnr-home'
        },{
          cartoId: '9', 
          css: 'lnr-dinner'
        },{
          cartoId: '6', 
          css: 'lnr-question-circle'
        },{
          cartoId: '5', 
          css: 'lnr-enter'
        },{
          cartoId: '7', 
          css: 'lnr-bullhorn'
        }
      ]
    }},
    onFilterChange: function(id) {
      var self=this;
      return function() {
        self.props.handleFilter(id);
        console.log('calling handleFilter with ID', id)
      }
      
    },


    render: function() {
      var self = this;

      var filterItems = this.props.filterOfferings.map(function(offering) {
        var cssString = 'FilterItem lnr ' + offering.css;
        return (
            <li className={cssString} key={offering.cartoId} onClick={self.onFilterChange(offering.cartoId)}>
            </li>
          )
      })
        return (
            <footer className="Filter">
                <ul className="FilterItems">
                  {filterItems}
                </ul>
            </footer>
        )
    }
});
