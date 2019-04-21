// This is the root component for #search-page

import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import SearchPageForm from './SearchPage/SearchPageForm';
import SearchResult from './SearchPage/SearchResult';

class SearchPage extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      searchingKeyword: this.props.query.q || '',
      searchedKeyword: '',
      searchedPages: [],
      searchResultMeta: {},
    };

    this.search = this.search.bind(this);
    this.changeURL = this.changeURL.bind(this);
  }

  componentDidMount() {
    const keyword = this.state.searchingKeyword;
    if (keyword !== '') {
      this.search({ keyword });
    }
  }

  static getQueryByLocation(location) {
    const search = location.search || '';
    const query = {};

    search.replace(/^\?/, '').split('&').forEach((element) => {
      const queryParts = element.split('=');
      query[queryParts[0]] = decodeURIComponent(queryParts[1]).replace(/\+/g, ' ');
    });

    return query;
  }

  changeURL(keyword, refreshHash) {
    let hash = window.location.hash || '';
    // TODO 整理する
    if (refreshHash || this.state.searchedKeyword !== '') {
      hash = '';
    }
    if (window.history && window.history.pushState) {
      window.history.pushState('', `Search - ${keyword}`, `/_search?q=${keyword}${hash}`);
    }
  }

  search(data) {
    const keyword = data.keyword;
    if (keyword === '') {
      this.setState({
        searchingKeyword: '',
        searchedPages: [],
        searchResultMeta: {},
      });

      return true;
    }

    this.setState({
      searchingKeyword: keyword,
    });

    this.props.crowi.apiGet('/search', { q: keyword })
      .then((res) => {
        this.changeURL(keyword);

        this.setState({
          searchedKeyword: keyword,
          searchedPages: res.data,
          searchResultMeta: res.meta,
        });
      })
      .catch((err) => {
        // TODO error
        // this.setState({
        // });
      });
  }

  render() {
    return (
      <div>
        <div className="search-page-input">
          <SearchPageForm
            t={this.props.t}
            crowi={this.props.crowi}
            onSearchFormChanged={this.search}
            keyword={this.state.searchingKeyword}
          />
        </div>
        <SearchResult
          crowi={this.props.crowi}
          crowiRenderer={this.props.crowiRenderer}
          pages={this.state.searchedPages}
          searchingKeyword={this.state.searchingKeyword}
          searchResultMeta={this.state.searchResultMeta}
        />
      </div>
    );
  }

}

SearchPage.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  crowi: PropTypes.object.isRequired,
  crowiRenderer: PropTypes.object.isRequired,
  query: PropTypes.object,
};
SearchPage.defaultProps = {
  // pollInterval: 1000,
  query: SearchPage.getQueryByLocation(window.location || {}),
};

export default withTranslation()(SearchPage);
