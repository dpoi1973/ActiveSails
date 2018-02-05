/**
 * hikeController
 *
 * @description :: Server-side logic for managing hike
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const fs = require('fs')
'use strict'
module.exports = {
    searchby: function (req, res) {
        let condition = req.body;
        let whereObj = utilsService.getWhereCondition(condition.condition);
        var responseresult = { status: '', totalCount: 0, pageIndex: 0, pageSize: 0, datas: [] };
        repackdetail.count({ where: whereObj }).then(function (resultcount) {
            responseresult.totalCount = resultcount;

            return repackdetail.find({
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

    output: function (req, res) {
        let meetingid = req.query.meetingid;
        console.log(req.query)
        repackdetail.find({ meetingid: meetingid })
            .then(deta => {
                let fina = [];
                let allo = _.groupBy(deta, function (n) {
                    return n.userid;
                });
                for (var key in allo) {
                    let thisk = {};
                    thisk.Kcoin = '';
                    thisk.username = allo[key][0].username;
                    for (var i = 0; i < allo[key].length; i++) {
                        thisk.Kcoin += allo[key][i].getsum.toString() + ','
                    }
                    thisk.Kcoin = thisk.Kcoin.substring(0, thisk.Kcoin.length - 1)
                    fina.push(thisk);
                }
                var colums = [
                    { header: '姓名', key: 'username' },
                    { header: '抽奖得到的K币', key: 'Kcoin' }
                ]
                utilsService.xls(colums, fina, 'Kcoin.xlsx', function (result) {
                    let stre = fs.createReadStream('Kcoin.xlsx')
                    res.set({
                        "Content-type": "application/octet-stream",
                        "Content-Disposition": "attachment;filename=" + encodeURI('Kcoin.xlsx')
                    });

                    stre.on("data", (chunk) => res.write(chunk, "binary"));

                    stre.on('end', function () {
                        res.end();
                    });
                })
            })
            .catch(err => {
                res.json(err)
            })
    }
};