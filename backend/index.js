import express from "express";
import pkg from "body-parser";
import cors from "cors";
import axios from "axios";
import soap1 from "strong-soap";
import {
  getEntry,
  insertEntry,
  updateCallStatus,
  updateJobStatus,
  getAllEntries,
  updateJobInfo,
} from "./db.js";
import cron from "node-cron";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "./.env") });
import { LocalStorage } from "node-localstorage";

const localStorage = new LocalStorage("./scratch");

var soap = soap1.soap;
const { json } = pkg;

const app = express();
const port = 3479;

app.use(json());
app.use(cors());

const getCallInfo = async (startDate, endDate, callNo) => {
  try {
    const url = "https://fssstag.servicepower.com/sms/services/SPDService";
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
        SOAPAction: "#POST",
        "Content-Type": "text/xml;charset=UTF-8",
      },
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
};

const updateSPCallStatus = async (entry, newCallStatusID) => {
  try {
    const url = "https://fssstag.servicepower.com/sms/services/SPDService";
    const bodyxml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
            <soapenv:Header/>
            <soapenv:Body>
              <urn:updateCallInfoObj>
                  <UserInfo>
                    <UserID>AAA46246</UserID>
                    <Password>sptest</Password>
                    <SvcrAcct>AAA46246</SvcrAcct>
                  </UserInfo>
                  <CallNumber>${entry.CallNumber}</CallNumber>
                  <MfgId>${entry.MfgId}</MfgId>
                  <FSSCallId>${entry.FSSCallId}</FSSCallId>
                  <SPCallStatusID>${newCallStatusID}</SPCallStatusID>
              </urn:updateCallInfoObj>
            </soapenv:Body>
        </soapenv:Envelope>`;

    var resp = await axios.post(url, bodyxml, {
      headers: {
        SOAPAction: "#POST",
        "Content-Type": "text/xml;charset=UTF-8",
      },
    });

    var XMLHandler = soap.XMLHandler;
    var xmlHandler = new XMLHandler();
    var xmldata = resp.data;
    var jsonData = xmlHandler.xmlToJson(null, xmldata, null);
    //console.log('>>> Response >>> ', jsonData);
    return jsonData.Body.getResponseInfo9;
  } catch (err) {
    console.log(err);
    return null;
  }
};

function yyyymmdd (x) {
  var y = x.getFullYear().toString();
  var m = (x.getMonth() + 1).toString();
  var d = x.getDate().toString();
  d.length == 1 && (d = "0" + d);
  m.length == 1 && (m = "0" + m);
  var yyyymmdd = y + m + d;
  return yyyymmdd;
}

const getAccessToken = async () => {
  try {
    const url = "https://api.servicefusion.com/oauth/access_token";
    const data = {
      grant_type: "client_credentials",
      client_id: process.env.SERVICEFUSION_CLIENT_ID,
      client_secret: process.env.SERVICEFUSION_CLIENT_SECRET,
    };

    var resp = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return resp.data;
  } catch (err) {
    console.log(">>> Get Access Token Error >>>", err);
    return null;
  }
};

const refreshAccessToken = async refresh_token => {
  try {
    const url = "https://api.servicefusion.com/oauth/access_token";
    const data = {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    };

    var resp = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return resp.data;
  } catch (err) {
    console.log(">>> Get Access Token Error >>>", err);
    return null;
  }
};

const checkAccessToken = async () => {
  var access_token = localStorage.getItem("access-token");
  if (access_token == null) {
    console.log(">>> Access Token is null. trying to get new token >>>");
    access_token = await getAccessToken();
    localStorage.setItem("access-token", access_token.access_token);
    localStorage.setItem("refresh-token", access_token.refresh_token);
  }

  try {
    const url = "https://api.servicefusion.com/v1/me";
    var resp = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    //console.log(' >>> checkAccessToken >>> ', resp.data);
    return access_token;
  } catch (err) {
    console.log(">>> checkAccessToken error >>> ", err);
    if (err.response.data.code == 401) {
      //unauthorized, so refresh token
      console.log(" >>> Invalid credential. so refresh token");
      var refresh_token = localStorage.getItem("refresh-token");
      refresh_token = await refreshAccessToken(refresh_token);
      if (refresh_token != null) {
        localStorage.setItem("access-token", refresh_token.access_token);
        localStorage.setItem("refresh-token", refresh_token.refresh_token);
        return refresh_token.access_token;
      } else {
        access_token = await getAccessToken();
        localStorage.setItem("access-token", access_token.access_token);
        localStorage.setItem("refresh-token", access_token.refresh_token);
        return access_token.access_token;
      }
    } else {
      console.log(" >>> checkAccessToken Error >>>", err);
    }

    return null;
  }
};

const createSFJob = async entry => {
  var access_token = localStorage.getItem("access-token");

  if (access_token == null) {
    console.log(">>> Access Token is null. trying to get new token >>>");
    access_token = await getAccessToken();
    localStorage.setItem("access-token", access_token.access_token);
    localStorage.setItem("refresh-token", access_token.refresh_token);
  }

  try {
    const url = "https://api.servicefusion.com/v1/jobs";
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
      status: "Unscheduled",
    };

    var resp = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    //console.log(' >>> createSFJob Success >>> ', resp.data);
    return resp.data;
  } catch (err) {
    console.log(" >>> Create SF Job Error >>>", err);
    return null;
  }
};

const getCustomer = async (firstname, lastname) => {
  var access_token = await checkAccessToken();

  try {
    const url = "https://api.servicefusion.com/v1/customers";

    var resp = await axios.get(url, {
      params: {
        "filters[contact_first_name]": firstname,
        "filters[contact_last_name]": lastname,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    //console.log(' >>> getCustomer >>> ', resp.data);
    return resp.data;
  } catch (err) {
    console.log(" >>> getCustomer Error >>>", err);
    return null;
  }
};

const createCustomer = async entry => {
  var access_token = await checkAccessToken();

  try {
    const url = "https://api.servicefusion.com/v1/customers";

    var data = {
      customer_name: entry.FirstName + " " + entry.LastName,
      contacts: [
        {
          fname: entry.FirstName,
          lname: entry.LastName,
          emails: [
            {
              email: entry.Email,
            },
          ],
          is_primary: true,
        },
      ],
      locations: [
        {
          street_1: entry.Address1,
          street_2: entry.Address2,
          city: entry.City,
          state_prov: entry.State,
          postal_code: entry.ZipCode,
          country: entry.Country,
        },
      ],
    };

    var resp = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    //console.log(' >>> createCustomer >>> ', resp.data);
    return resp;
  } catch (err) {
    console.log(" >>> createCustomer Error >>>", err);
    return null;
  }
};

const createSFJobsForNewCall = async () => {
  try {
    var entries = await getAllEntries();
    if (entries.length > 0) {
      entries.forEach(async entry => {
        //console.log('>>> CallData >>>', callData);
        if (entry.CallStatus == "OPEN" && entry.JobId == "") {
          // New Call
          var customer = await getCustomer(entry.FirstName, entry.LastName);
          if (customer.items.length == 0) {
            await createCustomer(entry);
          }

          var job = await createSFJob(entry);
          if (job != null) {
            updateJobInfo(
              job.check_number,
              job.id,
              job.number,
              job.status,
              job.created_at
            );
          }
        }
      });
    }
  } catch (err) {
    console.log(" >>> Error >>> ", err);
  }
};

const getCallInfoData = async () => {
  var startDate = new Date();
  var endDate = startDate;
  endDate.setDate(endDate.getDate() - 7);
  startDate = "20230222";
  endDate = "20230225";
  try {
    var callInfoData = await getCallInfo(startDate, endDate, "");
    var callDatas = [];
    if (callInfoData != null && callInfoData.ErrorInfo == null) {
      if (callInfoData.numberOfCalls == 1) {
        callDatas.push(callInfoData.CallInfo);
      } else {
        callDatas = callInfoData.CallInfo;
      }
      //console.log('>>> Found new Call >>> ', callDatas);
    }

    if (callDatas.length > 0) {
      callDatas.forEach(async callData => {
        //console.log('>>> CallData >>>', callData);
        if (callData.CallStatus == "OPEN") {
          // New Call
          //console.log('>>> CallData >>>', callData.CallStatus);
          var entry = await getEntry("", callData.CallNumber);
          if (entry == undefined) {
            var insertId = await insertEntry(
              0,
              "",
              "",
              callData.CallNumber,
              callData.CallStatus,
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
            console.log(" >>> New Call is inserted to DB. ID = ", insertId);
          } else {
            /*if (entry.CallStatus != callData.CallStatus) {
              updateCallStatus(entry.CallNumber, callData.CallStatus);
              console.log(` >>> Updated Call Status from ${entry.CallStatus} to ${callData.CallStatus} for ${callData.CallNumber}`);
            }*/
          }
        } else {
          //console.log(" >>> CallStatus >>>", callData.CallStatus);
        }
      });
    }
  } catch (err) {
    console.log(" >>> Error >>> ", err);
  }
};

const updateJobStatusChange = async entry => {
  var access_token = await checkAccessToken();

  try {
    const url = "https://api.servicefusion.com/v1/jobs/" + entry.JobId;

    var resp = await axios.get(url, {
      params: {
        fields: "check_number,status,updated_at",
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    // console.log(' >>> updateJobStatusChange >>> ', resp.data);
    if (entry.JobStatus != resp.data.status) {
      updateJobStatus(entry.JobId, resp.data.status, resp.data.updated_at);
      console.log(
        ` >>> Job Status updated in DB from ${entry.JobStatus} to ${resp.data.status} for ${resp.data.check_number} `
      );
      entry.JobStatus = resp.data.status;
      return resp.data.status;
    } else {
      return null;
    }
  } catch (err) {
    console.log(" >>> updateJobStatusChange Error >>>", err);
    return null;
  }
};

const claimSubmission = async entry => {
  var access_token = await checkAccessToken();

  try {
    const url = "https://api.servicefusion.com/v1/jobs/" + entry.JobId;

    var resp = await axios.get(url, {
      params: {
        expand:
          "invoices,equipment,custom_fields,services,expenses,products,other_charges,labor_charges",
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
    });

    var jobData = resp.data;

    var brandNameValue = "";
    var repairDescriptionValue = "";
    var faultCodeValue = "";
    var jobCodeValue = "";

    jobData.custom_fields.forEach(customField => {
      if (customField.name == "repairDescription")
        repairDescriptionValue = customField.value;
      else if (customField.name == "manufacturerName")
        brandNameValue = customField.value;
      else if (customField.name == "jobCode") jobCodeValue = customField.value;
      else if (customField.name == "faultCode")
        faultCodeValue = customField.value;
    });

    const claimURL =
      "https://upgdev.servicepower.com:8443/services/claim/v1/submission";
    var claimData = {
      authentication: {
        userId: "AAA46246",
        password: "sptest",
      },
      claims: [
        {
          manufacturerName: jobData.parent_customer,
          claimNumber: jobData.invoices[0].number,
          customerFirstName: jobData.contact_first_name,
          customerLastName: jobData.contact_last_name,
          customerAddress1: jobData.street_1,
          customerAddress2: jobData.street_2,
          customerCity: jobData.city,
          customerState: jobData.state_prov,
          customerZipCode: jobData.postal_code,
          callNumber: jobData.number,
          brandName: brandNameValue,
          modelNumber:
            jobData.equipment.length > 0 ? jobData.equipment[0].model : "",
          serialNumber:
            jobData.equipment.length > 0
              ? jobData.equipment[0].serial_number
              : "",
          defectOrComplaintDescription: repairDescriptionValue,
          servicePerformedDescription: jobData.completion_notes,
          dateReceived: jobData.created_at,
          dateStarted: jobData.start_date,
          dateCompleted: jobData.closed_at,
          laborAmount:
            jobData.services.length > 0 ? jobData.services[0].total : 0,
          partsAmount:
            jobData.products.length > 0 ? jobData.products[0].total : 0,
          taxStateAmount: jobData.taxes_fees_total,
          otherAmount:
            jobData.other_charges.length > 0
              ? jobData.other_charges[0].total
              : 0,
          shippingChargeAmount: 0,
          travelChargeAmount: 0,
          mileageAmount: 0,
          parts: [],
        },
      ],
    };

    jobData.products.forEach(product => {
      var part = {
        number: product.name,
        quantity: product.multiplier,
        invoiceNumber:
          jobData.expenses.length > 0 ? jobData.expenses[0].notes : "",
        priceRequested: product.rate,
        distributorNumber:
          jobData.expenses.length > 0 ? jobData.expenses[0].purchased_from : "",
        faultCode: faultCodeValue,
        jobCode: jobCodeValue,
      };
      claimData.claims.parts.push(part);
    });

    var claimResp = await axios.post(claimURL, claimData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    var claimRespData = claimResp.data;
    return claimRespData;
  } catch (err) {
    console.log(" >>> claimSubmission Error >>>", err);
    return null;
  }
};

const ProcessJob = async () => {
  await getCallInfoData();
  await createSFJobsForNewCall();
  try {
    var entries = await getAllEntries();
    if (entries.length > 0) {
      entries.forEach(async entry => {
        //console.log('>>> CallData >>>', callData);
        var updatedStatus = await updateJobStatusChange(entry);
        var newCallStatusId = "";
        var newCallStatus = "";
        if (updatedStatus != null) {
          if (updatedStatus == "Scheduled" || updatedStatus == "Confirmed >") {
            newCallStatusId = "3";
            newCallStatus = "ACCEPTED";
          } else if (updatedStatus == "Completed >") {
            newCallStatusId = "5";
            newCallStatus = "COMPLETED";
          } else if (updatedStatus == "Canceled >") {
            newCallStatusId = "4";
            newCallStatus = "CANCELLED";
          } else if (updatedStatus == "PI - Scheduled") {
            newCallStatusId = "7";
            newCallStatus = "RESCHEDULED";
          } else if (updatedStatus == "Rejected") {
            newCallStatusId = "6";
            newCallStatus = "REJECTED";
          } else if (updatedStatus == "Invoiced") {
            newCallStatusId = "5";
            newCallStatus = "ACCEPTED";
            // var claimRespData = await claimSubmission(entry);
            // if (claimRespData != null && claimRespData.responseCode == "OK") {
            //   newCallStatus = "CLAIMED";
            // } else {
            //   console.log('>> Claim Submission Failed >>>', claimRespData);
            //   return;
            // }
          } else if (updatedStatus == "Unscheduled") {
            newCallStatusId = "2";
            newCallStatus = "OPEN";
          }

          var updateResult = await updateSPCallStatus(entry, newCallStatusId);
          if (updateResult.erroroccurred == "N") {
            //Updated Success
            console.log(
              `>>> Call Status updated from ${entry.CallStatus} to ${newCallStatus} for ${entry.CallNumber}`
            );
            await updateCallStatus(entry.CallNumber, newCallStatus);
          } else {
            console.log(
              `>>> Call Status update failed. ${updateResult.errorData.Description} `
            );
          }
        }

        var callClaim = await getCallInfo("", "", entry.CallNumber);
        if (callClaim != null && callClaim.ErrorInfo == null) {
          if (callClaim.CallStatus == "CLAIMED") {
            await updateCallStatus(entry.CallNumber, callClaim.CallStatus);
          }
        }
      });
    }
  } catch (err) {}
};

cron.schedule("*/8 * * * * *", () => {
  ProcessJob();

  /*var date = new Date();
  
  var callInfoData = getCallInfo();
  if (callInfoData != null) {
    if (callInfoData.ErrorInfo == null) {

    }
  }*/
});

app.post("/test", async (req, res) => {
  await ProcessJob();
  res.sendStatus(200);
});

app.get("/getJobsAndCalls", async (req, res) => {
  var entries = await getAllEntries();
  return res.status(200).json({
    result: entries,
  });
});

app.get("/getCallInfo", async (req, res) => {
  console.log(" getCallInfo >>> ", req.query);
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var callNo = req.query.callNo;
  if (callNo == null || callNo == undefined) callNo = "";

  try {
    const url = "https://fssstag.servicepower.com/sms/services/SPDService";
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
        SOAPAction: "#POST",
        "Content-Type": "text/xml;charset=UTF-8",
      },
    });

    var XMLHandler = soap.XMLHandler;
    var xmlHandler = new XMLHandler();
    var xmldata = resp.data;
    var jsonData = xmlHandler.xmlToJson(null, xmldata, null);
    //console.log(jsonData);

    return res.status(200).json({
      result: jsonData.Body.getCallInfoResponce,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

app.listen(port, () =>
  console.log(`app listening at http://localhost:${port}`)
);
