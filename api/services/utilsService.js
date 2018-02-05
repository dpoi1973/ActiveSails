'use strict'
var request = require('request');
const amqp = require('amqplib');
const JSFtp = require('jsftp');
const fs = require('fs');
const Excel = require('exceljs');

module.exports = {
  getWhereCondition: function (condition) {
    let tmp = {};
    let allcond = [];
    if (!condition) {
      condition = {};
    }
    Object.keys(condition).forEach(v => {
      //if(condition[v]) 不为空和方加，否则不用处理
      if (v.startsWith('or')) {
        var orconditon = {};
        orconditon[v.replace('or', '')] = { 'contains': condition[v] };
        allcond.push(orconditon);
      }
      else {


        if (_.isNumber(condition[v]) && condition[v] !== -1) {
          Object.assign(tmp, {
            [v]: condition[v]
          });
        } else if (_.isString(condition[v]) && condition[v] !== '') {
          if (_.startsWith(v, 'equal')) {
            Object.assign(tmp, {
              [v.replace('equal', '')]: condition[v]
            });
          }
          else {
            Object.assign(tmp, {
              [v]: { 'contains': condition[v] }
            });
          }

        } else if (_.isObject(condition[v]) && _.startsWith(v, 'node_')) {
          //datetime
          if (!condition[v]['nodea'])
            condition[v]['nodea'] = 0;
          if (!condition[v]['nodeb'])
            condition[v]['nodeb'] = 7;



          // if (_.isDate(new Date(condition[v]['startdate'])) === false)
          //     condition[v]['startdate'] = '2016-01-01';
          // if (_.isDate(new Date(condition[v]['enddate'])) === false)
          //     condition[v]['enddate'] = _.now();

          Object.assign(tmp, {
            [v.replace('node_', '')]: { '>=': condition[v]['nodea'], '<=': condition[v]['nodeb'] }
          });

        }
        else if (_.isObject(condition[v]) && _.has(condition[v], 'startdate') && _.has(condition[v], 'enddate')) {
          //datetime
          if (_.isString(condition[v].startdate) && condition[v].startdate === '')
            condition[v]['startdate'] = '2016-01-01';
          if (_.isString(condition[v].enddate) && condition[v].enddate === '')
            condition[v]['enddate'] = _.now();



          // if (_.isDate(new Date(condition[v]['startdate'])) === false)
          //     condition[v]['startdate'] = '2016-01-01';
          // if (_.isDate(new Date(condition[v]['enddate'])) === false)
          //     condition[v]['enddate'] = _.now();

          Object.assign(tmp, {
            [v]: { '>': new Date(condition[v]['startdate']), '<': new Date(condition[v]['enddate']) }
          });

        }
      }


    });
    if (allcond.length > 0) {

      var all = { or: allcond };
      if (judgeEmpty(tmp)) {
        Object.assign(all, tmp);
      }
      return all;
    }
    else {
      return tmp;
    }



  },
  reponseMessage: function (statusType, msg) {

    if (this.resStatusType[statusType] == undefined)
      statusType = 'Error';

    return { status: this.resStatusType[statusType], message: msg }

  },
  resStatusType: { OK: 'OK', Error: 'Error', Warning: 'Warning' },
  errResponseJson: function (err, res) {
    res.json(utilsService.reponseMessage('Error', err.message));

  },

  groupBy: function (sourcelist, groupargs) {
    var groupkey = groupargs.join(',');
    var gouplist = [];
    sourcelist.forEach(sor => {
      sor[groupkey] = '';
      groupargs.forEach(gr => {
        if (sor[gr]) {
          sor[groupkey] += sor[gr];
        }
        else {
          sor[groupkey] += 'empty';
        }
      })
      var keylist = [];
      for (var key in gouplist) {
        keylist.push(key);
      }
      if (keylist.indexOf(sor[groupkey]) == -1) {
        gouplist[sor[groupkey]] = [];
        gouplist[sor[groupkey]].push(sor);
      }
      else {
        gouplist[sor[groupkey]].push(sor);
      }
    })
    var result = [];
    for (var key in gouplist) {
      result.push(gouplist[key]);
    }
    return result;
  },


  sum: function (sourcelist, arg) {
    var slen = sourcelist.length;
    var amount = 0;
    while (slen--) {
      amount += Number(sourcelist[slen][arg]);
    }
    return amount.toFixed(5);
  },

  sendqueue: function (qName, data) {
    return new Promise(function (resolve, reject) {
      const open = amqp.connect("amqp://192.168.0.251");
      open.then((conn) => {
        conn.createChannel().then(ch => {
          ch.assertQueue(qName, { durable: true })
            .then(ok => {
              return ch.sendToQueue(qName, new Buffer(JSON.stringify(data)));
            })
            .then(ok => {
              resolve(ok);
            }).catch((e) => {
              reject(e);
            });
        })
      })
    })
  },

  ftpupload: function (filepath, filename) {
    var ftpconfig = {
      host: '192.168.0.214',
      port: 21,
      user: 'yhf',
      pass: '123456'
    }
    var currtime = Date.parse(new Date());
    const ftp = new JSFtp(ftpconfig);
    var ftppath = "meeting/" + currtime + '/' + filename;
    return new Promise((resolve, reject) => {
      ftp.raw("mkd", "/meeting", function (er, data) {
        ftp.raw("mkd", "/meeting/" + currtime, function (er, data) {
          ftp.put(filepath, '/' + ftppath, (err) => {
            if (err) {
              console.log(err);
              ftp.raw('quit',function (erro, data) {
                reject(err);
              });
            }
            else {
              ftp.raw('quit', function (erro, data) {
                resolve('ftp://192.168.0.214/'+ftppath);
              });
            }
          });
        })
      });
    });


  },

  download: function (filepath, filename) {
    var ftpconfig = {
      host: '192.168.0.214',
      port: 21,
      user: 'yhf',
      pass: '123456'
    }
    var currtime = Date.parse(new Date());
    const ftp = new JSFtp(ftpconfig);
    return new Promise((resolve, reject) => {
      ftp.get(filepath, filename, (err) => {
        if (err) {
          console.log(err);
          ftp.raw('quit',function (erro, data) {
            reject(err);
          });
        }
        else {
          ftp.raw('quit', function (erro, data) {
            let stream = fs.createReadStream(filename);
            resolve(stream);
            // stream.on('finish', (src) => {
            //     console.log('kaishi ')
            //     resolve(stream);
            //     stream.exit;
            //     // fs.unlinkSync(filename);
            // })
          });
        }
      });
    })
  },

  transdate : function (date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    h = h < 10 ? ('0' + h) : h;
    minute = minute < 10 ? ('0' + minute) : minute;
    second = second < 10 ? ('0' + second) : second;
    return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
},


xls: function(_columns,_data,_filename,callback){
var start_time = new Date();
var workbook = new Excel.stream.xlsx.WorkbookWriter({
  filename: _filename
});
var worksheet = workbook.addWorksheet('Sheet');


console.log(_data[5])
for(var i=0;i<_data.length;i++){
  _data[i].item = i+1;
  for(var key in _data[i]){
    if(_data[i][key]==null || _data[i][key]==undefined){
      _data[i][key] = '';
    }
  }
}

worksheet.columns = _columns;
var data = _data;
var length = data.length;

// 当前进度
var current_num = 0;
var time_monit = 400;
var temp_time = Date.now();

console.log('开始添加数据',length);
// 开始添加数据
for(let i in data) {
    // console.log(i)
  worksheet.addRow(data[i]).commit();
  current_num = i;
  if(Date.now() - temp_time > time_monit) {
    temp_time = Date.now();
    console.log((current_num / length * 100).toFixed(2) + '%');
  }
}
console.log('添加数据完毕：', (Date.now() - start_time));
workbook.commit();

var end_time = new Date();
var duration = end_time - start_time;

console.log('用时：' + duration);
console.log("程序执行完毕");
setTimeout(function() {
  callback(_filename);
}, 2000);
}



}


function judgeEmpty(obj) {
  for (var i in obj) {
    return true;
  }
  return false;
}