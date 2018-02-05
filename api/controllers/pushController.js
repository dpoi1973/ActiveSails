/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var request = require('request');


'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        console.log(whereObj);
        whereObj.pushstatus = { "<": "2" };
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        push.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return push.find({
                where: whereObj,
                skip: (condition.pageIndex - 1) * condition.pageSize,
                limit: condition.pageSize,
                sort: condition.sortby ? condition.sortby : null
            });
        })
            .then(function (results) {
                responseresult.status = 'OK';
                responseresult.datas = results;
                res.json(responseresult);
            })
            .error(function (er) {
                res.json({ status: 'error', err: er.message });
            });
    },

    timesearch: function (req, res) {
        let data = req.body;
        // console.log('timesearch', data);
        let url = `http://qy.guobiezhongxin.com/api/sendmessage`;
        if (data) {
            push.find({ pushtime: { '<': data.starttime }, pushstatus: '0' })
                .then(pus => {
                    console.log(pus)
                    if (pus.length > 0) {
                        async.mapSeries(pus, function (mess, callback) {
                            let weixinid = '';
                            for (var i = 0; i < mess.pushto.length; i++) {
                                weixinid += mess.pushto[i].userid + '|';
                            }
                            let datas = {
                                weixinid: weixinid.substring(0, weixinid.length - 1),
                                message: mess.pushmsg,
                                appid: 10
                            }
                            const options = {
                                method: 'POST',
                                uri: url,
                                json: true, // Automatically parses the JSON string in the response,
                                headers: {
                                    wlsh: '1'
                                },
                                body: datas,
                            }
                            request(options, (error, response, body) => {
                                if (!error) {
                                    push.update({ id: mess.id }, { pushstatus: "1" })
                                        .then(result => {
                                            callback(null, result);
                                        })
                                        .catch(err => {
                                            console.log(err);
                                            callback(err);
                                        })
                                } else {
                                    console.log(error);
                                    callback(error);
                                }
                            })
                        }, function (err, results) {
                            if (err) {
                                console.log(err);
                                res.json({ status: 'error', err: err });
                            } else {
                                res.json({ status: 'OK', datas: pus });
                            }
                        })

                    } else {
                        res.json({ status: 'OK', datas: pus });
                    }
                })
                .catch(err => {
                    console.log(err);
                    res.json({ status: 'error', err: err });
                })
        } else {
            res.json({ status: 'error', err: '无内容' });
        }
    },


    pushsave: function (req, res) {
        let data = req.body;
        push.findOne({ id: data.id })
            .then(push => {
                if (push) {
                    for (var key in data) {
                        push[key] = data[key];
                    }
                    push.save(err => {
                        if (err) {
                            res.json(err)
                        } else {
                            res.json(push);
                        }
                    });
                } else {
                    push.create(data)
                        .then(thes => {
                            res.json(thes);
                        })
                        .catch(err => {
                            res.json(err)
                        })
                    // res.json({ error: "未找到该议题" })
                }
            })
            .catch(err => {
                res.json(err);
            })
    }


};