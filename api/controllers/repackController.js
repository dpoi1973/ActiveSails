/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const _ = require('lodash');
const request = require('request');
'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        repack.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return repack.find({
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

    startpack: function (req, res) {
        let data = req.body;
        repack.findOne({ id: data.repackid, meetingid: data.meetingid })
            .then(repp => {
                if (repp) {
                    if (repp.repackstatus == "-1") {
                        res.json({ status: "error", err: "红包已作废" })
                    } else if (repp.repackstatus == "0") {
                        repack.update({ repackstatus: "1" }, { repackstatus: "0", operate: "关闭" })
                            .then(repacks => {
                                repack.update({ id: data.repackid, meetingid: data.meetingid }, { repackstatus: "1", operate: "激活" })
                                    .then(repack => {
                                        var total_money = (repack[0].allsum - repack[0].maxsum) / 100;
                                        var total_people = repack[0].number;
                                        var min_money = (repack[0].minsum / 100);
                                        // console.log(total_money,min_money);
                                        var acerepa = {
                                            repackid: data.repackid,
                                            meetingid: data.meetingid,
                                            status: true,
                                            tmp_money: repack[0].maxsum
                                        }
                                        for (var i = 0; i < total_people - 2; i++) {
                                            var repa = {
                                                repackid: data.repackid,
                                                meetingid: data.meetingid,
                                            };
                                            var j = i + 1;
                                            var safe_money = (total_money - (total_people - j) * min_money) / (total_people - j);
                                            var tmp_money = parseInt((Math.random() * (safe_money - min_money) + min_money));
                                            while (tmp_money >= (repack[0].maxsum / 100)) {
                                                tmp_money = parseInt((Math.random() * (safe_money - min_money) + min_money));
                                            }
                                            total_money = total_money - tmp_money;
                                            repa.status = true;
                                            repa.tmp_money = tmp_money * 100;
                                            sails.config.globalrepack.push(repa);
                                            if ((i + 2) == parseInt(repack[0].number / 2)) {
                                                sails.config.globalrepack.push(acerepa);
                                            }
                                        }
                                        var finarepa = {
                                            repackid: data.repackid,
                                            meetingid: data.meetingid,
                                            status: true,
                                            tmp_money: total_money * 100
                                        }
                                        sails.config.globalrepack.push(finarepa);
                                        console.log(sails.config.globalrepack)
                                        res.json({ status: 'OK', results: "红包生成完毕" });
                                    })
                                    .catch(err => {
                                        res.json({ status: 'error', err: err });
                                    })
                            })
                            .catch(err => {
                                console.log(err);
                                res.json({ status: 'error', err: err });
                            })
                    } else {
                        repack.update({ id: data.repackid, meetingid: data.meetingid }, { repackstatus: "0", operate: "关闭" })
                            .then(repack => {
                                sails.config.globalrepack = [];
                                res.json({ status: 'OK', results: "红包已经清空" });
                            })
                            .catch(err => {
                                res.json({ status: 'error', err: err });
                            })
                    }
                } else {
                    res.json({ status: 'error', err: '没有该红包' });
                }
            })

    },

    packMsg: function (req, res) {
        let data = req.body;
        try {
            console.log(data)
            let kkrepack = _.find(sails.config.globalrepack, {});
            console.log(kkrepack);
            data.meetingid = kkrepack.meetingid;
            data.repackid = kkrepack.repackid;

            async.waterfall([
                function (callback) {
                    user.findOne({ userid: data.wechatid, meetingid: data.meetingid })
                        .then(user => {
                            if (user) {
                                data.userid = user.id;
                                data.username = user.name;
                                data.avatar = user.avatar;
                                callback(null, data);
                            } else {
                                callback('对不起，您没有参加该会议');
                            }
                        })
                        .catch(err => {
                            callback(err);
                        })
                },
                function (pdata, callback) {
                    repack.findOne({ id: data.repackid, meetingid: data.meetingid })
                        .then(repack => {
                            if (repack.repackstatus != '1') {
                                callback('活动尚未开始');
                            } else {
                                callback(null, repack);
                            }
                        })
                        .catch(err => {
                            callback(err)
                        })
                },
                function (pdata, callback) {
                    console.log(data.repackid, data.meetingid, data.userid)
                    if (_.find(sails.config.globalrepack, { userid: data.userid })) {
                        callback('您已经抢过该红包');
                    } else {
                        try {
                            let ll = _.find(sails.config.globalrepack, { status: true });
                            if (ll) {
                                ll.status = false;
                                ll.userid = data.userid;
                                data.getsum = ll.tmp_money;
                                callback(null, null)
                            } else {
                                callback('红包已抢完');
                            }
                        } catch (err) {
                            callback(err);
                            console.log(err)
                        }
                    }
                },
                function (pdata, callback) {
                    repackdetail.create(data).then(detail => {
                        // console.log('create', detail)
                        callback(null, detail);
                    })
                        .catch(err => {
                            callback(err);
                        })
                },
                function (detail, callback) {
                    user.findOne({ userid: data.wechatid, meetingid: data.meetingid })
                        .then(us => {
                            if (us.Kcoin) {
                                us.Kcoin += data.getsum;
                            } else {
                                us.Kcoin = data.getsum;
                            }
                            us.save(err => {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, us);
                                }
                            });
                        })
                        .catch(err => {
                            callback(err);
                        })
                }
            ], function (err, results) {
                if (err) {
                    if (_.isArray(err)) {
                        err = JSON.stringify(err);
                    }
                    console.log('err', err);
                    res.json({ status: 'error', err: err });
                } else {
                    console.log('ok', data.getsum);
                    res.json({ status: 'OK', results: `恭喜你抢到了${data.getsum}K币！` });
                }
            })
        } catch (err) {
            res.json({ status: 'error', err: '活动尚未开始' })
        }
    },

    test: function (req, res) {
        console.log(sails.config.globalrepack)
        res.json(sails.config.globalrepack);
    },

    repackact: function (req, res) {
        let data = req.body;
        console.log('data', data);
        repack.update({ meetingid: data.meetingid, repackstatus: '1' }, { repackstatus: "0", operate: "关闭" })
            .then(result => {
                console.log('res', result)
                if (data.repackstatus == "0") {
                    repack.update({ id: data.repackid, meetingid: data.meetingid }, { repackstatus: "1", operate: "激活" })
                        .then(end => {
                            console.log('end', end);
                            // if (!sails.config.globalrepack) {
                            sails.config.globalrepack = [];
                            // }
                            let redPacketList = end[0].redPacketList;
                            console.log('list', redPacketList);
                            var maxrepa = null;
                            for (var i = 0; i < redPacketList.length; i++) {
                                if (redPacketList[i].Knum == 1) {
                                    maxrepa = {
                                        repackid: data.repackid,
                                        meetingid: data.meetingid,
                                        status: true,
                                        tmp_money: redPacketList[i].Kmoney
                                    };
                                }
                                for (var j = 0; j < redPacketList[i].Knum; j++) {
                                    var repa = {
                                        repackid: data.repackid,
                                        meetingid: data.meetingid,
                                        status: true,
                                        tmp_money: redPacketList[i].Kmoney
                                    };
                                    sails.config.globalrepack.push(repa);
                                }
                            }
                            // console.log(sails.config.globalrepack.length)
                            sails.config.globalrepack = _.shuffle(sails.config.globalrepack);
                            if (maxrepa) {
                                if (_.findIndex(sails.config.globalrepack, maxrepa) > Math.ceil(sails.config.globalrepack.length / 2)) {
                                    // console.log('jiaohuan',sails.config.globalrepack)
                                    sails.config.globalrepack = _.reverse(sails.config.globalrepack)
                                }
                            }
                            console.log(sails.config.globalrepack.length);
                            user.find({ "meetingid": data.meetingid })
                                .then(users => {
                                    if (users.length > 0) {
                                        console.log('>0')
                                        let weixinid = '';
                                        users.forEach(emp => {
                                            weixinid += emp.userid + '|';
                                        })
                                        let datas = {
                                            weixinid: weixinid.substring(0, weixinid.length - 1),
                                            message: '抢红包活动开始啦，大家快打开蓝牙摇一摇开始抢红包吧！',
                                            appid: 10
                                        }
                                        let url = `http://qy.guobiezhongxin.com/api/sendmessage`;
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
                                                console.log(body)
                                                res.json({ status: 'OK', results: '' });
                                            } else {
                                                console.log(error);
                                                res.json({ status: 'error', err: error });
                                            }
                                        })
                                    } else {
                                        res.json({ status: 'error', results: 'nouser' });
                                    }
                                })
                                .catch(err => {
                                    res.json(err);
                                })
                        }).catch(err => {
                            console.log(err);
                            res.json(err);
                        })
                } else {
                    console.log('111')
                    res.json(result);
                }
            })
            .catch(err => {
                res.json(err);
            })
    }

};
