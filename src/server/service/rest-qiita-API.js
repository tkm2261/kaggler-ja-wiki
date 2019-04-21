function getAxios(team, token) {
  return require('axios').create({
    baseURL: `https://${team}.qiita.com/api/v2`,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      authorization: `Bearer ${token}`,
    },
    responseType: 'json',
  });
}

/**
 * the service class of restQiitaAPI
 * Qiita API v2 documant https://qiita.com/api/v2/docs
 */

class RestQiitaAPIService {

  constructor(crowi) {
    this.crowi = crowi;
    this.config = crowi.getConfig();
    this.team = this.config.crowi['importer:qiita:team_name'];
    this.token = this.config.crowi['importer:qiita:access_token'];
    this.axios = getAxios(this.team, this.token);
  }

  /**
   * @memberof RestQiitaAPI
   * @param {string} team
   * @param {string} token
   */
  async reset() {
    this.team = this.config.crowi['importer:qiita:team_name'];
    this.token = this.config.crowi['importer:qiita:access_token'];
    this.axios = getAxios(this.team, this.token);
  }

  /**
   * get Qiita API
   * @memberof RestQiitaAPI
   * @param {string} path
   */
  async restAPI(path) {
    return this.axios.get(path)
      .then((res) => {
        const data = res.data;
        const total = res.headers['total-count'];

        return { data, total };
      });
  }

  /**
   * get Qiita user
   * @memberof RestQiitaAPI
   */
  async getQiitaUser() {
    const res = await this.restAPI('/users');
    const user = res.data;

    if (user.length > 0) {
      return user;
    }
  }


  /**
   * get Qiita pages
   * @memberof RestQiitaAPI
   * @param {string} pageNum
   * @param {string} perPage
   */
  async getQiitaPages(pageNum, perPage) {
    const res = await this.restAPI(`/items?page=${pageNum}&per_page=${perPage}`);
    const pages = res.data;
    const total = res.total;

    if (pages.length > 0) {
      return { pages, total };
    }
  }

}

module.exports = RestQiitaAPIService;
