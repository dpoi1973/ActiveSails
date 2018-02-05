/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');
var request = require('request');
var fs = require('fs');

'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        record.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return record.find({
                where: whereObj,
                skip: (condition.pageIndex - 1) * condition.pageSize,
                limit: condition.pageSize,
                sort: condition.sortby ? condition.sortby : '_id desc'
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


    upload: function (req, res) {
        req.file('newFile').upload({
            // don't allow the total upload size to exceed ~10MB
            maxBytes: 20000000
        }, function whenDone(err, uploadedFiles) {
            if (err) {
                return res.negotiate(err);
            }
            else
                // If no files were uploaded, respond with an error.
                if (uploadedFiles.length === 0) {
                    return res.badRequest('No file was uploaded');
                }
                else {
                    var filename = uploadedFiles[0].filename;
                    filename = filename.replace(/:/g, '').replace(/\//g, '');
                    var path = uploadedFiles[0].fd;
                    var data = req.body;
                    utilsService.ftpupload(path, filename).then(ftppath => {
                        data.fileurl = ftppath;
                        data.createdate = utilsService.transdate(new Date());
                        record.create(data).then(result => {
                            return res.json(result);
                        })
                            .catch(err => {
                                console.log(err);
                                return res.json(err);
                            })
                    })
                        .catch(err => {
                            console.log(err);
                            return res.json(err);
                        })
                }
        })
    },


    download: function (req, res) {
        try {
            console.log(req.query.ftppath)
            let ftppath = req.query.ftppath;
            let filenames = req.query.ftppath.split('/');
            let filename = filenames[filenames.length - 1];
            utilsService.download(ftppath, filename).then(ftp => {
                ftp.pipe(res);
                // res.set({
                //     "Content-type": "application/octet-stream",
                //     "Content-Disposition": "attachment;filename=" + encodeURI(req.query.filename)
                // });

                // ftp.on("data", (chunk) => res.write(chunk, "binary"));

                ftp.on('end', function () {
                    res.end();
                    fs.unlinkSync(filename);
                });
            })
                .catch(err => {
                    res.json({ Error: err });
                })
        } catch (err) {
            res.json({ Error: err });
        }
    },

    downloadphoto: function (req, res) {
        try {
            console.log(req.query.ftppath)
            let ftppath = req.query.ftppath;
            let username = req.query.username;
            let filenames = req.query.ftppath.split('/');
            let filename = username + filenames[filenames.length - 1];
            console.log(username, filename)
            utilsService.download(ftppath, filename).then(ftp => {
                // ftp.pipe(res);
                res.set({
                    "Content-type": "application/octet-stream",
                    "Content-Disposition": "attachment;filename=" + encodeURI(filename)
                });

                ftp.on("data", (chunk) => res.write(chunk, "binary"));

                ftp.on('end', function () {
                    res.end();
                });
            })
                .catch(err => {
                    res.json({ Error: err });
                })
        } catch (err) {
            res.json({ Error: err });
        }
    },

    choosephoto: function (req, res) {
        let data = req.body;
        console.log(data);
        async.mapSeries(data, function (use, callback) {
            if (use.status != '1') {
                console.log(use.userid, use.meetingid);
                user.findOne({ userid: use.userid, meetingid: use.meetingid })
                    .then(us => {
                        if (us) {
                            if (us.Kcoin) {
                                us.Kcoin += 3000;
                            } else {
                                us.Kcoin = 3000;
                            }
                            us.save(err => {
                                if (err) {
                                    callback(err)
                                } else {
                                    console.log(use.id)
                                    record.update({ id: use.id }, { status: '1' })
                                        .then(rec => {
                                            console.log(rec);
                                            let thistime = utilsService.transdate(new Date());
                                            let url = `http://qy.guobiezhongxin.com/api/sendmessage`;
                                            let messages = `您的照片被选中展示，恭喜您获得了 3000 K币！`;
                                            let datas = {
                                                weixinid: us.userid,
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
                                                        meetingid: use.meetingid,
                                                        pushtime: thistime,
                                                        pushmsg: messages,
                                                        pushto: us,
                                                        pushstatus: "2"
                                                    })
                                                        .then(result => {
                                                            callback(null, '奖励完成');
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
                                            // callback(null, '奖励完成');
                                        })
                                        .catch(err => {
                                            callback(err);
                                        })
                                }
                            });
                        } else {
                            console.log('没有用户')
                            callback(null, use.username + '没有用户');
                        }
                    })
                    .catch(err => {
                        callback(err);
                    })
            } else {
                callback(null, use.username + '已奖励！')
            }
        }, function (err, results) {
            if (err) {
                res.json({ status: 'error', err: err });
            } else {
                res.json({ status: 'OK', datas: results });
            }
        })
    },

    sharephoto: function (req, res) {
        let data = req.body;
        async.waterfall([
            function (callback) {
                user.find({ meetingid: data[0].meetingid })
                    .then(users => {
                        callback(null, users);
                    })
                    .catch(err => {
                        callback(err);
                    })
            },
            function (users, callback) {
                let thistime = utilsService.transdate(new Date());
                let url = 'http://test.yx3195.com/api/sendimage';
                async.mapSeries(data, function (record, call) {
                    let weixinidd = '';
                    for (var i = 0; i < users.length; i++) {
                        weixinidd += users[i].userid + '|';
                    }
                    let datas = {
                        weixinid: weixinidd.substring(0, weixinidd.length - 1),
                        serverId: record.serverId,
                        appid: 10
                    };
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
                            push.create({
                                meetingid: record.meetingid,
                                pushtime: thistime,
                                pushmsg: record.serverId,
                                pushto: users,
                                pushstatus: "2"
                            })
                                .then(result => {
                                    call(null, result);
                                })
                                .error(err => {
                                    console.log(err);
                                    call(err);
                                })
                        } else {
                            console.log(error);
                            call(error);
                        }
                    })
                }, function (err, results) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, results);
                    }
                })
            }
        ], function (err, results) {
            if (err) {
                res.json({ status: 'error', err: err });
            } else {
                res.json({ status: 'OK', datas: '分享完成' });
            }
        })


    }


};