import express from 'express';
import pkg from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import soap1 from 'strong-soap';

var soap = soap1.soap;
const { json } = pkg;

const app = express();
const port = 3479;

app.use(json());
app.use(cors());

app.get('/getCallInfo', async (req, res) => {
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

    var XMLHandler = soap.XMLHandler;
    var xmlHandler = new XMLHandler();
    var xmldata = resp.data;

    return res.status(200).json({
      result: xmlHandler.xmlToJson(null, xmldata, null)
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