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
        hike.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return hike.find({
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

    hikesave: function (req, res) {
        let data = req.body;
        hike.findOne({ id: data.id })
            .then(hike => {
                if (hike) {
                    for (var key in data) {
                        hike[key] = data[key];
                    }
                    hike.save(err => {
                        if (err) {
                            res.json(err)
                        } else {
                            res.json(hike);
                        }
                    });
                } else {
                    hike.create(data)
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