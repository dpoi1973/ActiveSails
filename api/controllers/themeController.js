/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        theme.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return theme.find({
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
    themeact: function (req, res) {
        let themeinfo = req.body;
        var meetingid = themeinfo.meetingid;
        theme.update({ meetingid: meetingid, themestatus: '1' }, { themestatus: "0" })
            .then(result => {
                if (themeinfo.themestatus == "0") {
                    theme.update({ id: themeinfo.id }, { themestatus: "1" })
                        .then(end => {
                            user.find({ "meetingid": meetingid })
                                .then(users => {
                                    if (users.length > 0) {
                                        let weixinid = '';
                                        users.forEach(emp => {
                                            weixinid += emp.userid + '|';
                                        })
                                        let message = {};
                                        message.articles = [];
                                        message.articles.push({
                                            title: '议题',
                                            description: themeinfo.themetitle
                                        })
                                        message.articles.push({
                                            title: '点击回复',
                                            description: '点击回复',
                                            url: `http://test.yx3195.com/meetingwechat/meeting/themeinfo?themeid=${themeinfo.id}`
                                        })
                                        messageService.sendNews(weixinid.substring(0, weixinid.length - 1), message, 10)
                                            .then(result => {
                                                res.json(end);
                                            }).catch(err => {
                                                res.json(err);
                                            })
                                    }
                                    else {
                                        res.json({ 'data': 'nouser' });
                                    }

                                })

                        }).catch(err => {
                            console.log(err);
                            res.json(err);
                        })
                } else {
                    res.json(result);
                }

            }).catch(err => {
                console.log(err);
                res.json(err);
            })
    },

    themesave: function (req, res) {
        let data = req.body;
        theme.findOne({ id: data.id })
            .then(them => {
                if (them) {
                    for (var key in data) {
                        them[key] = data[key];
                    }
                    them.save(err => {
                        if (err) {
                            res.json(err)
                        } else {
                            res.json(them);
                        }
                    });
                } else {
                    theme.create(data)
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