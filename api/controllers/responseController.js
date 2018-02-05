/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');
var request = require('request');
var _ = require('lodash');
'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        response.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return response.find({
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


    wechatMsg: function (req, res) {
        let data = req.body;
        user.findOne({ userid: data.wechatid, meetingid: data.meetingid })
            .then(user => {
                if (user) {
                    data.userid = user.id;
                    data.username = user.name;
                    data.avatar = user.avatar;
                    return response.create(data);
                } else {
                    throw '对不起，您没有参加此会议';
                }
            })
            .then(resp => {
                return response.find({
                    where: {
                        meetingid: data.meetingid,
                        themeid: data.themeid,
                    },
                    sort: 'createdAt asc'
                })
            })
            .then(resps => {
                res.json(resps);
            })
            .catch(err => {
                console.log(err);
                res.json({ status: 'error', err: err });
            })
    },


    finaresult: function (req, res) {
        let data = req.body;
        response.find({ themeid: data.themeid, meetingid: data.meetingid })
            .then(respp => {
                let finarespp = _.groupBy(respp,function(n){
                    return n.responsemsg;
                });
                console.log(finarespp)
                let kk = [];
                for (var key in finarespp){
                    let ll = {};
                    ll.key = key;
                    ll.value = finarespp[key].length;
                    kk.push(ll);
                }
                console.log(kk);
                res.json(kk);
            })
            .catch(err => {
                res.json({ status: 'error', err: err });
            })
    },


    getResults: function (req, res) {
        let data = req.body;
        console.log(data);
        let responseresult = {};
        async.waterfall([
            function (callback) {
                theme.findOne({
                    id: data.themeid,
                    meetingid: data.meetingid
                })
                    .then(them => {
                        console.log('theme', them)
                        if (them.themestatus != '-1') {
                            responseresult.Kcoin = them.Kcoin;
                            responseresult.themetitle = them.themetitle;
                            callback(null, them);
                        } else {
                            callback('没有可结算的议题！');
                        }
                    })
                    .error(err => {
                        callback(err);
                    })
            },
            function (them, callback) {
                if (_.isString(them.count)) {
                    them.count = _.parseInt(them.count);
                }
                response.find({
                    where: {
                        meetingid: data.meetingid,
                        themeid: data.themeid,
                        responsemsg: them.rightKey
                    },
                    limit: them.count,
                    sort: 'createdAt asc'
                })
                    .then(resps => {
                        responseresult.datas = resps;
                        if (resps.length > 0) {
                            callback(null, resps);
                        } else {
                            callback('结算失败，没有人答对这个议题！')
                        }
                    })
                    .error(err => {
                        callback(err);
                    })
            },
            function (resu, callback) {
                if (responseresult.Kcoin == '' || responseresult.Kcoin == null) {
                    responseresult.Kcoin = 0;
                } else {
                    console.log(` K币 小于 0`)
                    if (_.isString(responseresult.Kcoin)) {
                        responseresult.Kcoin = _.parseInt(responseresult.Kcoin);
                    }
                }
                let weixinidd = '';
                let thistime = utilsService.transdate(new Date());
                for (var i = 0; i < resu.length; i++) {
                    weixinidd += resu[i].wechatid + '|';
                }
                let url = `http://qy.guobiezhongxin.com/api/sendmessage`;
                let messages = `恭喜您通过答对议题 ${responseresult.themetitle} 获得了 ${responseresult.Kcoin} K币！`;
                let datas = {
                    weixinid: weixinidd.substring(0, weixinidd.length - 1),
                    message: messages,
                    appid: 10
                }
                console.log(datas);
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
                        console.log('发送消息成功', body)
                        push.create({
                            meetingid: data.meetingid,
                            pushtime: thistime,
                            pushmsg: messages,
                            pushto: resu,
                            pushstatus: "2"
                        })
                            .then(result => {
                                callback(null, resu);
                            })
                            .error(err => {
                                console.log(err);
                                callback(err);
                            })
                    } else {
                        console.log('发送消息失败')
                        console.log(error);
                        callback(error);
                    }
                })
            },
            function (results, callback) {
                console.log('rere', results)
                if (results.length > 0 && responseresult.Kcoin > 0) {
                    async.mapSeries(results, function (resu, call) {
                        user.findOne({ id: resu.userid })
                            .then(us => {
                                if (us.Kcoin) {
                                    us.Kcoin += responseresult.Kcoin;
                                } else {
                                    us.Kcoin = responseresult.Kcoin;
                                }
                                us.save(err => {
                                    if (err) {
                                        call(err)
                                    } else {
                                        call(null, us);
                                    }
                                });
                            })
                            .error(err => {
                                call(err)
                            })
                    }, function (err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            theme.update({
                                id: data.themeid,
                                meetingid: data.meetingid
                            }, { themestatus: '-1' })
                                .then(them => {
                                    callback(null, them);
                                })
                                .error(err => {
                                    callback(err);
                                });
                        }
                    })
                } else {
                    return theme.update({
                        id: data.themeid,
                        meetingid: data.meetingid
                    }, { themestatus: '-1' })
                        .then(them => {
                            callback(null, them);
                        })
                        .error(err => {
                            callback(err);
                        });
                }
            }
        ], function (err, results) {
            if (err) {
                console.log(err);
                res.json({ status: 'error', err: err });
            } else {
                responseresult.status = 'OK';
                res.json(responseresult);
            }
        })
    }



};