'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRedirect, browserHistory } from 'react-router';

import { Map } from './map.js';
import { Header } from './header.js';
import { Filter } from './filter.js';
import { About} from './about.js';
import { Privacy } from './privacy.js';
import { ContentGuidelines } from './guidelines.js';
import { TermsOfService } from './tos.js';


import '../scss/reset.scss';
import '../scss/app.scss';
import '../scss/font.scss';
import '../scss/page.scss';

var App = React.createClass({

  render: function() {
    return (
        <div>
            <Header title='StreetlivesNYC'
                         url='http://beta.streetlives.nyc'
                         location={this.props.location}/>

            {this.props.children}
        </div>
    )
  }
});

ReactDOM.render(
    <Router history={browserHistory}>
      <Route path="/" component={App}>
        <IndexRedirect to="map" />
        <Route path="about" component={About} />
        <Route path="privacy" component={Privacy} />
        <Route path="tos" component={TermsOfService} />
        <Route path="guidelines" component={ContentGuidelines} />
        <Route path="map" component={Map} />
      </Route>
    </Router>
  , document.getElementById('app'));
