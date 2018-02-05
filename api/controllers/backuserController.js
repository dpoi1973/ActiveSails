/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var request = require('request');

'use strict'
module.exports = {
    searchby: function(req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        backuser.count({ where: whereObj }).then(function(resultcount) {
                responseresult.totalCount = resultcount;

                return backuser.find({
                    where: whereObj,
                    skip: (condition.pageIndex - 1) * condition.pageSize,
                    limit: condition.pageSize,
                    sort: condition.sortby?condition.sortby:null
                });
            })
            .then(function(results) {
                responseresult.status = 'OK';
                responseresult.datas = results;
                res.json(responseresult);
            })
            .error(function(er) {
                res.json({ status: 'error', err: er.message });
            });
    },


      searchAll: function (req, res) {
        const url = `http://qy.guobiezhongxin.com/api/contacts/getallcontactsdetail`;
        const options = {
            method: 'POST',
            uri: url,
            json: true, // Automatically parses the JSON string in the response,
            headers: {
                wlsh: '1'
            },
            body: {},
        }
        request(options, (error, response, body) => {
            if (!error) {
                backuser.destroy({}).then(result => {
                    async.mapSeries(body.GoodList, function (people, callback) {
                        if (people.userid) {
                            people.meetingid = '';
                            people.meetingstatus = '';
                            people.meetingtitle = '';
                            people.meetingstarttime = '';
                            backuser.create(people)
                                .then(resul => {
                                    callback(null, resul);
                                })
                                .catch(err => {
                                    callback(err);
                                })
                        } else {
                            callback(null, 'ok');
                        }
                    }, function (err, results) {
                        if (err) {
                            res.json({ status: 'error', err: err });
                        } else {
                            res.json({ status: 'OK', datas: results})
                        }
                    })
                })
                    .catch(err => {
                        res.json({ status: 'error', err: err });
                    })
            } else {
                res.json({ status: 'error', err: error });
            }
        })
    }


};