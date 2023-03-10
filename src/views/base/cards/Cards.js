import React, { useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardGroup,
  CCardHeader,
  CCardImage,
  CCardLink,
  CCardSubtitle,
  CCardText,
  CCardTitle,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CCol,
  CRow,
  CBadge,
} from '@coreui/react'
import axios from 'axios';

const Cards = () => {

  useEffect(() => {
    const url = 'https://fssstag.servicepower.com/sms/services/SPDService';
    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SPDServicerService">
          <soapenv:Header/>
          <soapenv:Body>
            <urn:getCallInfoSearch>
                <UserInfo>
                  <UserID>AAA46246</UserID>
                  <Password>sptest</Password>
                  <SvcrAcct>AAA46246</SvcrAcct>
                </UserInfo>
                <FromDateTime>20211202</FromDateTime>
                <ToDateTime>20211208</ToDateTime>
                <Callno></Callno>
            </urn:getCallInfoSearch>
          </soapenv:Body>
      </soapenv:Envelope>`;

    async function makeRequest(url, bodyxml) {
      var resp = await axios.post(url, bodyxml, {
        headers: {
          'SOAPAction': '#POST',
          'Content-Type': 'text/xml;charset=UTF-8'
        }
      });
      console.log(' >>> resp >>> ', resp.response);
      /*const { response } = await soapRequest({ url: url, headers: soapheaders, xml: bodyxml, timeout: 1000 });
      const { headers, body, statusCode } = response;
      console.log(headers);
      console.log(body);
      console.log(statusCode);*/
    };
    
    makeRequest(url, xml);
  }, [])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="text-center">
            <strong>API</strong> <small>Bridge of ServicePower and Service Fusion</small>
          </CCardHeader>
          <CCardBody>
            <CRow xs={{ cols: 1, gutter: 4 }} md={{ cols: 2 }}>
              <CCol xs>
                <CCard>
                  <CCardBody>
                    <CRow >
                      <CCol xs={9}>
                        <CCardTitle xs={10}>Card title</CCardTitle>
                      </CCol>
                      <CCol xs={3} className="justify-center d-flex align-items-center">
                        <CBadge color="primary">New</CBadge>
                      </CCol>
                    </CRow>
                    <CCardText>
                      This is a wider card with supporting text below as a natural lead-in to
                      additional content. This content is a little bit longer.
                    </CCardText>
                    <CButton href="#">View</CButton>
                  </CCardBody>
                  <CCardFooter>
                    <small className="text-medium-emphasis">Last updated 3 mins ago</small>
                  </CCardFooter>
                </CCard>
              </CCol>
              <CCol xs>
                <CCard>
                  <CCardBody>
                    <CCardTitle>Card title</CCardTitle>
                    <CCardText>
                      This is a wider card with supporting text below as a natural lead-in to
                      additional content. This content is a little bit longer.
                    </CCardText>
                    <CButton href="#">Go somewhere</CButton>
                  </CCardBody>
                  <CCardFooter>
                    <small className="text-medium-emphasis">Last updated 3 mins ago</small>
                  </CCardFooter>
                </CCard>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Cards
