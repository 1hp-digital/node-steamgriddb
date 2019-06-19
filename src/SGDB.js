const request = require('request-promise-native');

class SGDB {
    /**
     * @param {(Object|String)} options Object or options API key
     * @param {String} options.key API key
     * @param {Object} options.headers Custom headers
     * @param {String} options.baseURL Base API URL
     */
    constructor(options) {
        this.baseURL = 'https://www.steamgriddb.com/api/v2';
        this.headers = {};

        if (options.baseURL) {
            this.baseURL = options.baseURL;
        }
        if (options.headers) {
            this.headers = {...options.headers};
        }
        if (options.key) {
            this.key = options.key;
        }

        if (typeof options === 'string') {
            this.key = options;
        }

        if (this.key) {
            this.headers.Authorization = `Bearer ${this.key}`;
        } else {
            process.emitWarning('API Key not provided, some methods won\'t work.');
        }
    }

    /**
     * @param {String} url API endpoint to append to baseURL
     * @param {String} method HTTP method
     * @return {Promise<Object>}
     */
    _handleRequest(method, url, params, formData = null) {
        let options = { uri: `${this.baseURL}${url}`, headers: this.headers, method: method, qs: params, simple: false };
        if (formData) {
            options = {...options, ...{formData: formData}};
        }

        return new Promise((resolve, reject) => {
            request(options)
                .then((response) => {
                    try {
                        JSON.parse(response);
                    } catch (err) {
                        reject(new Error('Server responded with invalid JSON.'));
                    }

                    const json = JSON.parse(response);
                    if (json.success) {
                        resolve(json); // Return whole output so each function can handle differently
                    }

                    if (!json.success) {
                        reject(new Error(json.errors));
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param {Object} options
     * @param {String} options.type ID Type. Should be "id" or "steam"
     * @param {Number} options.id Game ID. Could be Steam App ID or game ID
     * @return {Promise<Object>} JSON game response
     */
    getGame(options) {
        if (!['id','steam'].includes(options.type)) {
            return new TypeError('Invalid ID type. Must be "id" or "steam".');
        }

        return new Promise((resolve, reject) => {
            this._handleRequest('get', `/games/${options.type}/${options.id}`)
                .then((res) => {
                    if (res.success) {
                        resolve(res.data);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param {Number} id Game ID
     * @return {Promise<Object>} JSON game response
     */
    getGameById(id) {
        return this.getGame({type: 'id', id: id});
    }

    /**
     * @param {Number} id Steam App ID
     * @return {Promise<Object>} JSON game response
     */
    getGameBySteamAppId(id) {
        return this.getGame({type: 'steam', id: id});
    }

    /**
     * @param {Object} options
     * @param {Number} options.id Game ID. Could be Steam App ID or game ID
     * @param {String} options.type ID Type. Should be "id" or "steam"
     * @param {(Array|Undefined)} options.styles Array of grid styles.
     * @return {Promise<Object>} JSON grids response
     */
    getGrids(options) {
        if (!['game','steam'].includes(options.type)) {
            return new TypeError('Invalid ID type. Must be "id" or "steam".');
        }

        let stylesParam = null;
        if (typeof options.styles !== 'undefined') {
            stylesParam = {styles: options.styles.join(',')};
        }

        return new Promise((resolve, reject) => {
            this._handleRequest('get', `/grids/${options.type}/${options.id}`, stylesParam)
                .then((res) => {
                    if (res.success) {
                        resolve(res.data);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param {integer} id Game ID
     * @param {(Array|Undefined)} styles Array of grid styles.
     * @return {Promise<Object>} JSON grid response
     */
    getGridsById(id, styles) {
        return this.getGrids({type: 'game', id: id, styles: styles});
    }

    /**
     * @param {integer} id Steam App ID
     * @param {(Array|Undefined)} styles Array of grid styles.
     * @return {Promise<Object>} JSON grid response
     */
    getGridsBySteamAppId(id, styles) {
        return this.getGrids({type: 'steam', id: id, styles: styles});
    }

    /**
     * @param {Object} options
     * @param {String} options.direction Vote direction. Should be "up" or "down".
     * @param {Number} options.id Grid ID.
     * @return {Promise<Boolean>}
     */
    voteGrid(options) {
        if (!['up','down'].includes(options.direction)) {
            return new TypeError('Invalid direction paramater. Can only vote "up" or "down".');
        }

        return new Promise((resolve, reject) => {
            this._handleRequest('post', `/grids/vote/${options.direction}/${options.id}`)
                .then((res) => {
                    if (res.success) {
                        resolve(true);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param {Number} id Grid ID
     * @return {Promise<Boolean>}
     */
    upvoteGrid(id) {
        return this.voteGrid({direction: 'up', id: id});
    }

    /**
     * @param {Number} id Grid ID
     * @return {Promise<Boolean>}
     */
    downvoteGrid(id) {
        return this.voteGrid({direction: 'down', id: id});
    }

    /**
     * @param  {Number} Game ID.
     * @param  {String} Style name.
     * @param  {Grid} File stream
     * @return {Boolean}
     */
    uploadGrid(gameId, style, grid) {
        const formData = {
            game_id: gameId,
            style: style,
            grid: grid
        };

        return new Promise((resolve, reject) => {
            this._handleRequest('post', '/grids', null, formData)
                .then((res) => {
                    if (res.success) {
                        resolve(true);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param  {(Number|Array)} Grid ID or array of IDs to delete
     * @return {Promise<Boolean>}
     */
    deleteGrids(ids) {
        let gridIds = ids;
        if (Array.isArray(ids)) {
            gridIds = ids.join(',');
        }

        return new Promise((resolve, reject) => {
            this._handleRequest('delete', `/grids/${gridIds}`)
                .then((res) => {
                    if (res.success) {
                        resolve(true);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * @param  {String} term Search term
     * @return {[type]}
     */
    searchGame(term) {
        return new Promise((resolve, reject) => {
            this._handleRequest('get', `/search/autocomplete/${encodeURIComponent(term)}`)
                .then((res) => {
                    if (res.success) {
                        resolve(res.data);
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }
}

module.exports = SGDB;