'use strict';
var router = require('express').Router();
var request = require('request');
var log4js = require('log4js');
var fs = require('fs');
var CrossSiteMiddleware = require('../middleware/cors');
var CONSTANTS = require('../constants/Constants');
var chinaRegions = require('../runtime/template/regions/china-regions.json');
var internationalRegions = require('../runtime/template/regions/international-regions.json');

var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var filesLogger = log4js.getLogger('Regions');

//设置跨域访问
router.all('*', CrossSiteMiddleware());

router.get('/getregions', function (req, res, next) {
  // 如果是json文件的话，可以直接使用require方法将文件加载进来，能够有效的利用缓存，二次加载是比每次文件读取要快
  // var data = fs.readFileSync('runtime/template/regions/china-regions.json', { encoding: 'utf-8'});
  res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: chinaRegions });
});

router.get('/getiregions', function (req, res, next) {
  // 如果是json文件的话，可以直接使用require方法将文件加载进来，能够有效的利用缓存，二次加载是比每次文件读取要快
  // var data = fs.readFileSync('runtime/template/regions/international-regions.json', { encoding: 'utf-8'});
  res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: internationalRegions });
});

// 爬取微信公众号中群发的区域信息
router.get('/fetch-wechat-region', function (req, res, next) {
  var getOptions = function (id) {
    var url = "https://mp.weixin.qq.com/cgi-bin/getregions?t=setting/ajax-getregions&id="+id+"&token=1132292345&lang=zh_CN&token=1132292345&lang=zh_CN&f=json&ajax=1&random=0.5106673404728537";

    var cookie = "gsScrollPos=; pgv_pvi=9821777920; pgv_si=s4242891776; uin=null; skey=null; luin=null; lskey=null; user_id=null; session_id=null; sig=h0137e01d60c35ad3392e5d0faf209fb24a5734e7b1a6f12300627c672ee634b0a02606ac389e01e61f; mmad_session=0a9432426c5776d529b9e35ae87094b50ff534b1973b478d70b928848c3f0c69c3bb4ef824f96f2675c6879a0878fca98e8a6c724e0a567ff13b9d84a189db99593f8791310220f061e3a864b445c71046ab0de143ee7c2bf25b9ed0e51addf711de1c56c245721266e7088080fefde3; uuid=fdc273e348afec17e7f0748549b4f3d9; ticket=e7a740d453aa1d803f0ae8749da7f522d837cfc8; ticket_id=gh_1bd903cf1499; account=351958423@qq.com; cert=1ZFq27OrzmlKel6Eg0tig6h7l34oxYEe; noticeLoginFlag=1; data_bizuin=3210102823; data_ticket=QG3xfa6HKiSJuuRymiDN8Kg6OVMQBlnkfP4Kddb+AuFcfNeqXf6pWrsehymRV+jC; ua_id=pxf3dZVqx3Mxnwc4AAAAAJvM9FUSBLHEAIGXp1AaM80=; xid=74b212df1b462d0d1890567dc8a51d2f; openid2ticket_oJ0hWvxFiQLZxdrodTHXjHaPgfag=9LgNNpjD9IFU1nUojEzhGEWe0cPALTWV72ufasAlgFw=; webwx_data_ticket=gSdNU62RS6TYshuxszFwtzTK; slave_user=gh_1bd903cf1499; slave_sid=SkR2MFpybGFRYmVZb1dleTNwcnQwbVp4Q3hWNDdDdHh4ZEV5YmZVRFNkTGlxTl9FZHplanFiNjFDT09TOE9sc3dlTlV5VXdKT1A3czEyQ3Y5dzFndkFsbFlhVGJpZ3VaZFk0QzN3UHJOZTRlbzdpbnhoeUs2Q0NUakF5NDdMS0lQMUxaYVRUdVFZUUJkYzJ2; bizuin=3227469368";

    var referer = "https://mp.weixin.qq.com/cgi-bin/masssendpage?t=mass/send&token=1132292345&lang=zh_CN";


    return {
      url: url,
      headers: {
        Cookie: cookie,
        Referer: referer
      }
    };
  }

  var getCountrys = function () {
    return [{"id":"1017","name":"中国"},{"id":"1012","name":"不丹"},{"id":"1080","name":"中国台湾"},{"id":"1054","name":"中国澳门"},{"id":"1031","name":"中国香港"},{"id":"1098","name":"中非共和国"},{"id":"1107","name":"丹麦"},{"id":"1081","name":"乌克兰"},{"id":"1165","name":"乌兹别克斯坦"},{"id":"1163","name":"乌干达"},{"id":"1164","name":"乌拉圭"},{"id":"1025","name":"乔治亚"},{"id":"1167","name":"也门"},{"id":"1089","name":"亚美尼亚"},{"id":"1119","name":"以色列"},{"id":"1037","name":"伊拉克"},{"id":"1038","name":"伊朗"},{"id":"1070","name":"俄罗斯"},{"id":"1093","name":"保加利亚"},{"id":"1118","name":"克罗地亚"},{"id":"1030","name":"关岛"},{"id":"1029","name":"冈比亚"},{"id":"1039","name":"冰岛"},{"id":"1048","name":"列支敦士登"},{"id":"1015","name":"刚果民主共和国"},{"id":"1049","name":"利比亚"},{"id":"1130","name":"利比里亚"},{"id":"1014","name":"加拿大"},{"id":"1114","name":"加纳"},{"id":"1033","name":"匈牙利"},{"id":"1055","name":"北马里亚纳群岛"},{"id":"1086","name":"南非"},{"id":"1013","name":"博茨瓦纳"},{"id":"1150","name":"卡塔尔"},{"id":"1152","name":"卢旺达"},{"id":"1132","name":"卢森堡"},{"id":"1036","name":"印度"},{"id":"1034","name":"印度尼西亚"},{"id":"1116","name":"危地马拉"},{"id":"1109","name":"厄瓜多尔"},{"id":"1111","name":"厄立特里亚"},{"id":"1104","name":"古巴"},{"id":"1123","name":"吉尔吉斯斯坦"},{"id":"1106","name":"吉布提"},{"id":"1126","name":"哈萨克斯坦"},{"id":"1101","name":"哥伦比亚"},{"id":"1102","name":"哥斯达黎加"},{"id":"1100","name":"喀麦隆"},{"id":"1078","name":"土耳其"},{"id":"1044","name":"圣基茨和尼维斯"},{"id":"1075","name":"圣马力诺"},{"id":"1162","name":"坦桑尼亚"},{"id":"1110","name":"埃及"},{"id":"1112","name":"埃塞俄比亚"},{"id":"1124","name":"基里巴斯"},{"id":"1160","name":"塔吉克斯坦"},{"id":"1158","name":"塞内加尔"},{"id":"1103","name":"塞尔维亚,黑山"},{"id":"1157","name":"塞拉利昂"},{"id":"1072","name":"塞舌尔"},{"id":"1058","name":"墨西哥"},{"id":"1019","name":"多米尼加共和国"},{"id":"1004","name":"奥地利"},{"id":"1083","name":"委内瑞拉"},{"id":"1091","name":"孟加拉"},{"id":"1002","name":"安哥拉"},{"id":"1001","name":"安提瓜岛和巴布达"},{"id":"1087","name":"安道尔"},{"id":"1142","name":"尼加拉瓜"},{"id":"1141","name":"尼日利亚"},{"id":"1144","name":"尼泊尔"},{"id":"1011","name":"巴哈马"},{"id":"1148","name":"巴基斯坦"},{"id":"1007","name":"巴巴多斯岛"},{"id":"1147","name":"巴布亚新几内亚"},{"id":"1064","name":"巴拿马"},{"id":"1094","name":"巴林"},{"id":"1010","name":"巴西"},{"id":"1095","name":"布隆迪"},{"id":"1115","name":"希腊"},{"id":"1068","name":"帕劳群岛"},{"id":"1047","name":"开曼群岛"},{"id":"1018","name":"德国"},{"id":"1040","name":"意大利"},{"id":"1153","name":"所罗门群岛"},{"id":"1133","name":"拉脱维亚"},{"id":"1143","name":"挪威"},{"id":"1105","name":"捷克共和国"},{"id":"1051","name":"摩尔多瓦"},{"id":"1134","name":"摩洛哥"},{"id":"1050","name":"摩纳哥"},{"id":"1009","name":"文莱"},{"id":"1021","name":"斐济"},{"id":"1076","name":"斯威士兰"},{"id":"1156","name":"斯洛伐克"},{"id":"1155","name":"斯洛文尼亚"},{"id":"1129","name":"斯里兰卡"},{"id":"1074","name":"新加坡"},{"id":"1061","name":"新喀里多尼亚"},{"id":"1063","name":"新西兰"},{"id":"1042","name":"日本"},{"id":"1099","name":"智利"},{"id":"1125","name":"朝鲜"},{"id":"1043","name":"柬埔寨"},{"id":"1026","name":"格恩西岛"},{"id":"1024","name":"格林纳达"},{"id":"1028","name":"格陵兰"},{"id":"1092","name":"比利时"},{"id":"1138","name":"毛里塔尼亚"},{"id":"1056","name":"毛里求斯"},{"id":"1161","name":"汤加"},{"id":"1071","name":"沙特阿拉伯"},{"id":"1022","name":"法国"},{"id":"1149","name":"波兰"},{"id":"1066","name":"波多黎各"},{"id":"1077","name":"泰国"},{"id":"1041","name":"泽西岛"},{"id":"1117","name":"洪都拉斯"},{"id":"1032","name":"海地"},{"id":"1005","name":"澳大利亚"},{"id":"1035","name":"爱尔兰"},{"id":"1120","name":"牙买加"},{"id":"1079","name":"特立尼达和多巴哥"},{"id":"1097","name":"玻利维亚"},{"id":"1073","name":"瑞典"},{"id":"1016","name":"瑞士"},{"id":"1166","name":"瓦努阿图"},{"id":"1069","name":"留尼旺岛"},{"id":"1008","name":"百慕大"},{"id":"1027","name":"直布罗陀"},{"id":"1046","name":"科威特"},{"id":"1146","name":"秘鲁"},{"id":"1121","name":"约旦"},{"id":"1140","name":"纳米比亚"},{"id":"1136","name":"缅甸"},{"id":"1151","name":"罗马尼亚"},{"id":"1082","name":"美国"},{"id":"1127","name":"老挝"},{"id":"1122","name":"肯尼亚"},{"id":"1113","name":"芬兰"},{"id":"1154","name":"苏丹"},{"id":"1159","name":"苏里南"},{"id":"1023","name":"英国"},{"id":"1062","name":"荷兰"},{"id":"1060","name":"莫桑比克"},{"id":"1131","name":"莱索托"},{"id":"1065","name":"菲律宾"},{"id":"1085","name":"萨摩亚"},{"id":"1067","name":"葡萄牙"},{"id":"1137","name":"蒙古"},{"id":"1020","name":"西班牙"},{"id":"1096","name":"贝宁"},{"id":"1168","name":"赞比亚"},{"id":"1084","name":"越南"},{"id":"1090","name":"阿塞拜疆"},{"id":"1108","name":"阿尔及利亚"},{"id":"1088","name":"阿尔巴尼亚"},{"id":"1000","name":"阿拉伯联合酋长国"},{"id":"1145","name":"阿曼"},{"id":"1003","name":"阿根廷"},{"id":"1006","name":"阿鲁巴"},{"id":"1045","name":"韩国"},{"id":"1053","name":"马其顿"},{"id":"1057","name":"马尔代夫"},{"id":"1139","name":"马拉维"},{"id":"1059","name":"马来西亚"},{"id":"1052","name":"马绍尔群岛"},{"id":"1135","name":"马达加斯加"},{"id":"1128","name":"黎巴嫩"}];
  }

  var fetchRegion = function (id) {
    return new Promise(function (resolve) {
      request(getOptions(id), function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var info = JSON.parse(body);
          if (info && info.data) {
            resolve(info.data);
          } else {
            resolve([]);
          }
        }
      });
    })
  }

  var countrys = getCountrys();
  var promises = [];
  for (let i = 0; i < countrys.length; i ++) {
    const country = countrys[i];
    promises.push(fetchRegion(country.id));
  }

  Promise.all(promises).then(function(pdata) {
    var tpromises = []
    for (let i = 0; i < pdata.length; i ++) {
      var tpromise = new Promise(function(resolve) {
        var provinces = pdata[i];
        if (provinces.length) {
          var ppromises = [];
          for (let j = 0; j < provinces.length; j ++) {
            var province = provinces[j];
            ppromises.push(fetchRegion(province.id))
          }

          Promise.all(ppromises).then(function (cdata) {
            for (let j = 0; j < cdata.length; j ++) {
              var citys = cdata[j];
              if (citys.length) {
                provinces[j].c = citys
              }
            }

            countrys[i].c = provinces;
            resolve(1);
          })
        } else {
          resolve(1);
        }
      })

      tpromises.push(tpromise)
    }

    Promise.all(tpromises).then(function () {
      res.status(200).json(countrys)
    })
  });
});

module.exports = router;
