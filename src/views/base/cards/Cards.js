import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types';
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

function yyyymmdd(x) {
  var y = x.getFullYear().toString();
  var m = (x.getMonth() + 1).toString();
  var d = x.getDate().toString();
  (d.length == 1) && (d = '0' + d);
  (m.length == 1) && (m = '0' + m);
  var yyyymmdd = y + m + d;
  return yyyymmdd;
}

const CallInfoCard = (props) => {
  const { callInfo } = props;
  console.log(' >>> CallInfoCard >>>', callInfo);
  return (
    <CRow xs={{ cols: 1, gutter: 4 }} md={{ cols: 2 }}>
      <CCol xs>
        <CCard>
          <CCardBody>
            <CRow >
              <CCol xs={9}>
                <CCardTitle xs={10}>{callInfo.ConsumerInfo.ConsumerFirstName} {callInfo.ConsumerInfo.ConsumerLastName}</CCardTitle>
              </CCol>
              <CCol xs={3} className="justify-center d-flex align-items-center">
                <CBadge color="primary">{callInfo.CallStatus}</CBadge>
              </CCol>
            </CRow>
            <CCardText>
              {callInfo.ProbelmDesc}
            </CCardText>
            {/* <CButton href="#">View</CButton> */}
          </CCardBody>
          <CCardFooter>
            <small className="text-medium-emphasis">{callInfo.CallCreatedOn}</small>
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
  )
}

CallInfoCard.propTypes = {
  callInfo: PropTypes.object.isRequired
};

const Cards = () => {

  const [callInfos, setCallInfos] = useState([]);

  useEffect(() => {
    var date = new Date();
    const url = document.location.protocol + "//" + document.location.hostname + ":3479/getCallInfo";
    console.log(" >>> url >>> ", url);
    axios.get(url, {
      params: {
        // startDate: yyyymmdd(date),
        // endDate: yyyymmdd(date)
        startDate: '20221202',
        endDate: '20221208'
      }
    }).then(function (response) {
      console.log(" >>> response >>> ", response.data);
      var getCallInfoResponse = response.data.result.Body.getCallInfoResponce;
      if (getCallInfoResponse) {
        if (getCallInfoResponse.ErrorInfo == null) {
          if (getCallInfoResponse.numberOfCalls == 1) {
            let val = [];
            val.push(getCallInfoResponse.CallInfo);
            setCallInfos(val);
            console.log(" >>> CallInfo >>> ", val);
          } else {
            setCallInfos(getCallInfoResponse.CallInfo);
          }
        }
      }
    }).catch(function (error) {
      console.log(' >>> error >>> ', error);
    }).finally(function () {

    });
  }, [])

  return (
    <CRow >
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="text-center">
            <strong>API</strong> <small>Bridge of <strong>ServicePower</strong> and <strong>Service Fusion</strong></small>
          </CCardHeader>
          <CCardBody>
            {callInfos.map((callInfo, index) => {
              return (
                <CallInfoCard key={index}
                  callInfo={callInfo} />
              )
            })}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow >
  )
}

export default Cards
