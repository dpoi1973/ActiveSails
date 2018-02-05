/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const request = require('request');
const async = require('async');
const fs = require('fs')

'use strict'
module.exports = {

    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        user.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return user.find({
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

    usersearchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        user.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return user.find({
                where: whereObj,
                skip: (condition.pageIndex - 1) * condition.pageSize,
                limit: condition.pageSize,
                sort: condition.sortby ? condition.sortby : null
            });
        })
            .then(function (results) {
                async.mapSeries(results, function (user, callback) {
                    sign.find({
                        where: { userid: user.id },
                        limit: 1,
                        sort: 'createdAt desc'
                    })
                        .then(sig => {
                            if (sig.length > 0) {
                                user.hikelocation = sig[0].hikelocation;
                                user.hikeLng = sig[0].hikeLng;
                                user.hikeLat = sig[0].hikeLat;
                                user.signtime = sig[0].createdAt;
                                user.hikeid = sig[0].hikeid;
                            } else {
                                user.hikelocation = '';
                                user.hikeLng = '';
                                user.hikeLat = '';
                                user.hikeid = '';
                                user.signtime = '';
                            }
                            callback(null, user);
                        })
                        .catch(err => {
                            console.log('err', err);
                            callback(err);
                        })
                }, function (err, result) {
                    if (err) {
                        res.json({ status: 'error', err: err });
                    } else {
                        responseresult.status = 'OK';
                        responseresult.datas = result;
                        res.json(responseresult);
                    }
                })
            })
            .error(function (er) {
                res.json({ status: 'error', err: er });
            });
    },


    createList: function (req, res) {
        let meets = req.body;
        let users = req.body.users;
        async.mapSeries(users, function (us, callback) {
            us.meetingstatus = meets.meetingstatus;
            us.meetingid = meets.meetingid;
            us.meetingtitle = meets.meetingtitle;
            us.meetingstarttime = meets.meetingstarttime;
            user.findOrCreate({ userid: us.userid, weixinid: us.weixinid, meetingid: us.meetingid }, { userid: us.userid, weixinid: us.weixinid, name: us.name, avatar: us.avatar, department: us.department, meetingid: us.meetingid, meetingstatus: us.meetingstatus, meetingtitle: us.meetingtitle, meetingstarttime: us.meetingstarttime }).exec(function (err, fin) {
                if (err) {
                    callback(null, err)
                } else {
                    callback(null, null);
                }
            })
        }, function (err, results) {
            if (err) {
                res.json({ status: 'error', err: err });
            } else {
                res.json({ status: 'OK', datas: results });
            }
        })

    },


    usersave: function (req, res) {
        let data = req.body;
        user.findOne({ id: data.id })
            .then(user => {
                if (user) {
                    for (var key in data) {
                        user[key] = data[key];
                    }
                    user.save(err => {
                        if (err) {
                            res.json(err)
                        } else {
                            res.json(user);
                        }
                    });
                } else {
                    user.create(data)
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
    },


    qrMsg: function (req, res) {
        var data = req.body;
        async.waterfall([
            function (callback) {
                meeting.find({
                    where: {},
                    limit: 1,
                    sort: '_id desc'
                })
                    .then(meeting => {
                        console.log(meeting)
                        data.meetingid = meeting[0].id;
                        callback(null, meeting);
                    })
                    .catch(err => {
                        console.log(err);
                        callback(err);
                    })
            },
            function (meeting, callback) {
                user.findOne({ userid: data.wechatid, meetingid: data.meetingid })
                    .then(user => {
                        if (user) {
                            data.userid = user.id;
                            data.username = user.name;
                            data.avatar = user.avatar;
                            callback(null, user);
                        } else {
                            callback('对不起，您没有参加此会议');
                        }
                    })
                    .catch(err => {
                        callback(err);
                    })
            },
            function (user, callback) {
                qrcode.findOne({ meetingid: data.meetingid })
                    .then(qrco => {
                        if (qrco) {
                            if (qrco.qrtime == data.qrcode) {
                                callback(null, qrco);
                            } else {
                                callback('二维码已失效,请重试');
                            }
                        } else {
                            callback('当前没有二维码激活');
                        }
                    })
                    .catch(err => {
                        callback(err);
                    })
            },
            function (qrco, callback) {
                sign.findOne({ meetingid: data.meetingid, userid: data.userid }).then(sig => {
                    if (sig) {
                        callback('已经签到');
                    } else {
                        sign.create({ meetingid: data.meetingid, userid: data.userid, username: data.username, avatar: data.avatar })
                            .then(si => {
                                callback(null, sig);
                            })
                            .catch(err => {
                                callback(err)
                            })
                    }
                })
                    .catch(err => {
                        callback(err)
                    })
            },
            function (qrco, callback) {
                let qrtime = Date.parse(new Date()).toString();
                qrcode.findOne({ meetingid: data.meetingid })
                    .then(qrco => {
                        if (qrco) {
                            qrco.qrtime = qrtime;
                            qrco.save(err => {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, qrtime);
                                }
                            })
                        } else {
                            callback('当前没有二维码激活');
                        }
                    })
                    .catch(err => {
                        callback(err)
                    })
            },
        ], function (err, results) {
            if (err) {
                if (_.isArray(err)) {
                    err = JSON.stringify(err);
                }
                res.json({ status: 'error', err: err });
            } else {
                res.json({ status: 'OK', qrcode: results });
            }
        })
    },


    qrcode: function (req, res) {
        let data = req.body;
        console.log(data);
        let qrtime = Date.parse(new Date()).toString();
        qrcode.findOne({ meetingid: data.meetingid })
            .then(qrco => {
                if (qrco) {
                    qrco.qrtime = qrtime;
                    qrco.save(err => {
                        if (err) {
                            res.json({ status: 'error', err: err });
                        } else {
                            res.json(qrtime);
                        }
                    })
                } else {
                    qrcode.create({ meetingid: data.meetingid, qrtime: qrtime })
                        .then(result => {
                            res.json(result.qrtime);
                        })
                        .catch(err => {
                            res.json({ status: 'error', err: err });
                        })
                }
            })
            .catch(err => {
                res.json({ status: 'error', err: err });
            })
    },


    unsign: function (req, res) {
        let meetingid = req.query.meetingid;
        let uslist = [];
        user.find({ meetingid: meetingid })
            .then(results => {
                console.log('res', results.length)
                async.mapSeries(results, function (us, callback) {
                    sign.findOne({ userid: us.id, meetingid: meetingid })
                        .then(sig => {
                            if (sig) {
                                console.log('1', sig);
                                callback(null, null);
                            } else {
                                console.log('0', sig);
                                us.status = '未签到';
                                uslist.push(us);
                                callback(null, us);
                            }
                        })
                        .catch(err => {
                            console.log('err', err);
                            callback(err);
                        })
                }, function (err, result) {
                    if (err) {
                        res.json({ status: 'error', err: err });
                    } else {
                        console.log(uslist);
                        var colums = [
                            { header: '姓名', key: 'name' },
                            { header: '会议', key: 'meetingtitle' },
                            { header: 'K币', key: 'Kcoin' },
                            { header: '签到状态', key: 'status' }
                        ]
                        utilsService.xls(colums, uslist, 'sign.xlsx', function (result) {
                            let stre = fs.createReadStream('sign.xlsx')
                            res.set({
                                "Content-type": "application/octet-stream",
                                "Content-Disposition": "attachment;filename=" + encodeURI('sign.xlsx')
                            });

                            stre.on("data", (chunk) => res.write(chunk, "binary"));

                            stre.on('end', function () {
                                res.end();
                            });
                        })
                    }
                })
            })
            .catch(err => {
                res.json({ status: 'error', err: err });
            })
    }




};