'use strict'
var request = require('request');
const fs = require('fs');

module.exports = {
    sendNews: function (touser, message, appid) {
        return new Promise(function (resolve, reject) {
            let url = `http://test.yx3195.com/api/sendmsglist`;
            let data = {};
            data.weixinid = touser;
            data.message = message;
            data.appid = appid;
            const options = {
                method: 'POST',
                uri: url,
                json: true, // Automatically parses the JSON string in the response,
                headers: {
                    wlsh: '1'
                },
                body: data,
            }
            request(options, (error, response, body) => {
                if (!error) {
                    resolve({ "data": "success" });
                } else {
                    reject(error);
                }
            })
        })
    }
}



