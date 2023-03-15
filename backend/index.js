import express from 'express';
import pkg from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import soap1 from 'strong-soap';
import { getEntry, insertEntry, updateCallStatus, updateJobStatus, getAllEntries, updateJobInfo } from './db.js';
import cron from 'node-cron';import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({path:path.resolve(__dirname, './.env')});
import { LocalStorage } from "node-localstorage";

const localStorage = new LocalStorage('./scratch');

var soap = soap1.soap;
const { json } = pkg;

const app = express();
const port = 3479;

app.use(json());
app.use(cors());

const getCallInfo = async (startDate, endDate, callNo) => {
  try {
    const url = 'https://fssstag.servicepower.com/sms/services/SPDService';
    const bodyxml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
            <soapenv:Header/>
            <soapenv:Body>
              <urn:getCallInfoSearch>
                  <UserInfo>
                    <UserID>AAA46246</UserID>
                    <Password>sptest</Password>
                    <SvcrAcct>AAA46246</SvcrAcct>
                  </UserInfo>
                  <FromDateTime>${startDate}</FromDateTime>
                  <ToDateTime>${endDate}</ToDateTime>
                  <Callno>${callNo}</Callno>
              </urn:getCallInfoSearch>
            </soapenv:Body>
        </soapenv:Envelope>`;

    var resp = await axios.post(url, bodyxml, {
      headers: {
        'SOAPAction': '#POST',
        'Content-Type': 'text/xml;charset=UTF-8'
      }
    });

    var XMLHandler = soap.XMLHandler;
    var xmlHandler = new XMLHandler();
    var xmldata = resp.data;
    var jsonData = xmlHandler.xmlToJson(null, xmldata, null);
    //console.log('>>> Response >>> ', jsonData);
    return jsonData.Body.getCallInfoResponce;
  } catch (err) {
    console.log(err);
    return null;
  }
}

function yyyymmdd(x) {
  var y = x.getFullYear().toString();
  var m = (x.getMonth() + 1).toString();
  var d = x.getDate().toString();
  (d.length == 1) && (d = '0' + d);
  (m.length == 1) && (m = '0' + m);
  var yyyymmdd = y + m + d;
  return yyyymmdd;
}

const getAccessToken = async () => {
  try {
    const url = 'https://api.servicefusion.com/oauth/access_token';
    const data = {
      grant_type : 'client_credentials',
      client_id : process.env.SERVICEFUSION_CLIENT_ID,
      client_secret : process.env.SERVICEFUSION_CLIENT_SECRET
    };

    var resp = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return resp.data;

  } catch (err) {
    console.log('>>> Get Access Token Error >>>', err);
    return null;
  }
}

const refreshAccessToken = async (refresh_token) => {
  try {
    const url = 'https://api.servicefusion.com/oauth/access_token';
    const data = {
      grant_type : 'refresh_token',
      refresh_token : refresh_token
    };

    var resp = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return resp.data;

  } catch (err) {
    console.log('>>> Get Access Token Error >>>', err);
    return null;
  }
}

const checkAccessToken = async () => {
  var access_token = localStorage.getItem('access-token');
  if (access_token == null) {
    console.log('>>> Access Token is null. trying to get new token >>>');
    access_token = await getAccessToken();
    localStorage.setItem('access-token', access_token.access_token);
    localStorage.setItem('refresh-token', access_token.refresh_token);
  }

  try {
    const url = 'https://api.servicefusion.com/v1/me';
    var resp = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization : 'Bearer ' + access_token,
        Accept : 'application/json'
      }
    });

    console.log(' >>> checkAccessToken >>> ', resp.data);
    return access_token;

  } catch (err) {
    console.log('>>> checkAccessToken error >>> ', err);
    if (err.response.data.code == 401) {
      //unauthorized, so refresh token
      console.log(' >>> Invalid credential. so refresh token')  ;
      var refresh_token = localStorage.getItem('refresh-token');
      refresh_token = await refreshAccessToken(refresh_token)
      localStorage.setItem('access-token', refresh_token.access_token);
      localStorage.setItem('refresh-token', refresh_token.refresh_token);
      return refresh_token.access_token;
    } else {
      console.log(' >>> checkAccessToken Error >>>', err);
    }
    
    return null;
  }
}

const createSFJob = async (entry) => {
  var access_token = localStorage.getItem('access-token');

  if (access_token == null) {
    console.log('>>> Access Token is null. trying to get new token >>>');
    access_token = await getAccessToken();
    localStorage.setItem('access-token', access_token.access_token);
    localStorage.setItem('refresh-token', access_token.refresh_token);
  }

  try {
    const url = 'https://api.servicefusion.com/v1/jobs';
    const data = {
      check_number: entry.CallNumber,
      contact_first_name: entry.FirstName,
      contact_last_name: entry.LastName,
      street_1: entry.Address1,
      street_2: entry.Address2,
      city: entry.City,
      state_prov: entry.State,
      postal_code: entry.ZipCode,
      customer_name: entry.FirstName + " " + entry.LastName,
      description: entry.Description,
      category: "Manufacturer Warranty",
      status: "Unscheduled"
    };

    var resp = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization : 'Bearer ' + access_token,
        Accept : 'application/json'
      }
    });

    console.log(' >>> createSFJob Success >>> ', resp.data);
    return resp.data;

  } catch (err) {
    console.log(' >>> Create SF Job Error >>>', err);
    return null;
  }
}

const getCustomer = async (firstname, lastname) => {
  var access_token = await checkAccessToken();

  try {
    const url = 'https://api.servicefusion.com/v1/customers';

    var resp = await axios.get(url, {
      params: {
        'filters[contact_first_name]': firstname,
        'filters[contact_last_name]': lastname,
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization : 'Bearer ' + access_token,
        Accept : 'application/json'
      }
    });

    console.log(' >>> getCustomer >>> ', resp.data);
    return resp.data;

  } catch (err) {
    console.log(' >>> getCustomer Error >>>', err);
    return null;
  }
}

const createCustomer = async (entry) => {
  var access_token = await checkAccessToken();

  try {
    const url = 'https://api.servicefusion.com/v1/customers';

    var data = {
      customer_name: entry.FirstName + " " + entry.LastName,
      contacts : [{
        fname: entry.FirstName,
        lname: entry.LastName,
        emails: [{
          email: entry.Email
        }],
        is_primary: true
      }],
      locations: [{
        street_1: entry.Address1,
        street_2: entry.Address2,
        city: entry.City,
        state_prov: entry.State,
        postal_code: entry.ZipCode,
        country: entry.Country
      }]
    };

    var resp = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization : 'Bearer ' + access_token,
        Accept : 'application/json'
      }
    });

    console.log(' >>> createCustomer >>> ', resp.data);
    return resp;

  } catch (err) {
    console.log(' >>> createCustomer Error >>>', err);
    return null;
  }
}

const createSFJobsForNewCall = async () => {
  try {
    var entries = await getAllEntries();
    if (entries.length > 0) {
      entries.forEach(async (entry) => {
        //console.log('>>> CallData >>>', callData);
        if (entry.CallStatus == "OPEN" && entry.JobId == "") {
          // New Call
          var customer = await getCustomer(entry.FirstName, entry.LastName);
          if (customer.items.length == 0) {
            await createCustomer(entry);
          }

          var job = await createSFJob(entry);
          if (job != null) {
            updateJobInfo(job.check_number, job.id, job.number, job.status, job.created_at);
          }
        }
      });
    }
  } catch (err) {
    console.log(' >>> Error >>> ', err);
  }
}

const getCallInfoData = async () => {
  var startDate = new Date();
  var endDate = startDate;
  endDate.setDate(endDate.getDate() - 7);
  startDate = '20230225';
  endDate = '20230301';
  try {
    var callInfoData = await getCallInfo(startDate, endDate, "");
    var callDatas = [];
    if (callInfoData != null && callInfoData.ErrorInfo == null) {
      callDatas.push(callInfoData.CallInfo);
      console.log('>>> CallDatas >>> ', callDatas);
    }
  
    if (callDatas.length > 0) {
      callDatas.forEach(async (callData) => {
        //console.log('>>> CallData >>>', callData);
        if (callData.CallStatus == "OPEN") {
          // New Call
          var entry = await getEntry("", callData.CallNumber);
          if (entry == undefined) {
            var insertId = await insertEntry(0, "", "", callData.CallNumber, callData.CallStatus, 
              callData.MfgId,
              callData.FSSCallId,
              callData.ConsumerInfo.ConsumerFirstName,
              callData.ConsumerInfo.ConsumerLastName,
              callData.ConsumerInfo.ConsumerAddress1,
              callData.ConsumerInfo.ConsumerAddress2,
              callData.ConsumerInfo.PostcodeLevel1,
              callData.ConsumerInfo.PostcodeLevel2,
              callData.ConsumerInfo.PostcodeLevel3,
              callData.ConsumerInfo.Postcode,
              callData.ConsumerInfo.EmaiIld,
              callData.ProbelmDesc,
              callData.CallCreatedOn
            );
            console.log(' >>> New Call is inserted to DB. ID = ', insertId);
          } else {
            if (entry.CallStatus != callData.CallStatus) {
              updateCallStatus(entry.CallNumber, callData.CallStatus);
              console.log(` >>> Updated Call Status from ${entry.CallStatus} to ${callData.CallStatus} for ${callData.CallNumber}`);
            }
          }
        } else {
          console.log(" >>> CallStatus >>>", callData.CallStatus);
        }
      });
    }
  } catch (err) {
    console.log(' >>> Error >>> ', err);
  }
}

const updateJobStatusChange = async (entry) => {
  var access_token = await checkAccessToken();

  try {
    const url = 'https://api.servicefusion.com/v1/jobs/' + entry.JobId;

    var resp = await axios.get(url, {
      params: {
        fields: 'check_number,status,updated_at'
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization : 'Bearer ' + access_token,
        Accept : 'application/json'
      }
    });

    console.log(' >>> updateJobStatusChange >>> ', resp.data);
    if (entry.JobStatus != resp.data.status) {
      updateJobStatus(resp.data.check_number, resp.data.status, resp.data.updated_at);
      console.log(` >>> Job Status updated in DB from ${entry.JobStatus} to ${resp.data.status} for ${resp.data.check_number} `);
    }
    return true;

  } catch (err) {
    console.log(' >>> updateJobStatusChange Error >>>', err);
    return false;
  }
}

const test = async () => {
  await getCallInfoData();
  await createSFJobsForNewCall();
  try {
    var entries = await getAllEntries();
    if (entries.length > 0) {
      entries.forEach(async (entry) => {
        //console.log('>>> CallData >>>', callData);
        var isUpdated = await updateJobStatusChange(entry);
        if (isUpdated) {

        }
      });
    }
  } catch (err) {

  }
}

cron.schedule('*/30 * * * * *', () => {
  /*var date = new Date();
  
  var callInfoData = getCallInfo();
  if (callInfoData != null) {
    if (callInfoData.ErrorInfo == null) {

    }
  }*/
});

app.post('/test', async (req, res) => {
  await test();
  res.sendStatus(200);
});

app.get('/getCallInfo', async (req, res) => {
  console.log(" getCallInfo >>> ", req.query);
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var callNo = req.query.callNo;
  if (callNo == null || callNo == undefined)
    callNo = "";

  try {
    const url = 'https://fssstag.servicepower.com/sms/services/SPDService';
    const bodyxml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
            <soapenv:Header/>
            <soapenv:Body>
              <urn:getCallInfoSearch>
                  <UserInfo>
                    <UserID>AAA46246</UserID>
                    <Password>sptest</Password>
                    <SvcrAcct>AAA46246</SvcrAcct>
                  </UserInfo>
                  <FromDateTime>${startDate}</FromDateTime>
                  <ToDateTime>${endDate}</ToDateTime>
                  <Callno>${callNo}</Callno>
              </urn:getCallInfoSearch>
            </soapenv:Body>
        </soapenv:Envelope>`;

    var resp = await axios.post(url, bodyxml, {
      headers: {
        'SOAPAction': '#POST',
        'Content-Type': 'text/xml;charset=UTF-8'
      }
    });

    var XMLHandler = soap.XMLHandler;
    var xmlHandler = new XMLHandler();
    var xmldata = resp.data;
    var jsonData = xmlHandler.xmlToJson(null, xmldata, null);
    console.log(jsonData);

    return res.status(200).json({
      result: jsonData.Body.getCallInfoResponce
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ error: err });
  }
});

app.listen(
  port,
  () => console.log(`app listening at http://localhost:${port}`)
);