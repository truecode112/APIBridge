import express from 'express';
import pkg from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import convert from 'xml-js';
import xml2js from 'xml2js';

const { json } = pkg;

const app = express();
const port = 3479;

app.use(json());
app.use(cors());

app.post('/getCallInfo', async (req, res) => {
  console.log(" getCallInfo >>> ", req.body);
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
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
                  <Callno></Callno>
              </urn:getCallInfoSearch>
            </soapenv:Body>
        </soapenv:Envelope>`;

    var resp = await axios.post(url, bodyxml, {
      headers: {
        'SOAPAction': '#POST',
        'Content-Type': 'text/xml;charset=UTF-8'
      }
    });

    //console.log(' >>> resp >>>', convert.xml2json(resp.data));
    var xmldata = convert.xml2json(resp.data);
    const result = XMLValidator.validate(xmldata);
    if (result) {
      console.log('XML valid');
    }
    const parser = new XMLParser();
    const json = parser.parse(xmldata);
    console.log('>>> json >>> ', json);
    return res
      .status(200)
      .json({ result: resp.data });
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