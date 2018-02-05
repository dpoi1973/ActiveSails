/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

'use strict'
module.exports = {
    searchby: function(req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        meeting.count({ where: whereObj }).then(function(resultcount) {
                responseresult.totalCount = resultcount;

                return meeting.find({
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


    close: function(req,res) {
        let data = req.body;
        meeting.update({id: data.id},{meetingstatus: '0'})
        .then(result => {
            return theme.update({meetingid: data.id}, {themestatus: '1'});
        })
        .then(result => {
            return user.update({meetingid: data.id}, {meetingstatus: '0'});
        })
        .then(result => {
            return push.update({meetingid: data.id}, {pushstatus: '1'});
        })
        .then(result => {
            res.json({ status: 'OK', datas: result });
        })
        .catch(err => {
            res.json({ status: 'error', err: err });
        })
    },


    meetingsave: function (req, res) {
        let data = req.body;
        meeting.findOne({ id: data.id })
            .then(meeting => {
                if (meeting) {
                    for (var key in data) {
                        meeting[key] = data[key];
                    }
                    meeting.save(err => {
                        if (err) {
                            res.json(err)
                        } else {
                            res.json(meeting);
                        }
                    });
                } else {
                    meeting.create(data)
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