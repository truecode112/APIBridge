import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
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
} from "@coreui/react";
import axios from "axios";

function yyyymmdd (x) {
  var y = x.getFullYear().toString();
  var m = (x.getMonth() + 1).toString();
  var d = x.getDate().toString();
  d.length == 1 && (d = "0" + d);
  m.length == 1 && (m = "0" + m);
  var yyyymmdd = y + m + d;
  return yyyymmdd;
}

const CallInfoCard = props => {
  const { entry } = props;
  console.log(" >>> Entry >>>", entry);
  return (
    <CRow xs={{ cols: 1, gutter: 4 }} md={{ cols: 2 }}>
      <CCol xs>
        <CCard>
          <CCardBody>
            <CRow>
              <CCol xs={9}>
                <CCardTitle xs={10}>
                  {entry.FirstName} {entry.LastName}
                </CCardTitle>
              </CCol>
              <CCol xs={3} className='justify-center d-flex align-items-center'>
                {entry.CallStatus == "OPEN" && (
                  <CBadge color='primary'>{entry.CallStatus}</CBadge>
                )}
                {entry.CallStatus == "ACCEPTED" && (
                  <CBadge color='info'>{entry.CallStatus}</CBadge>
                )}
                {entry.CallStatus == "CANCELLED" && (
                  <CBadge color='warning'>{entry.CallStatus}</CBadge>
                )}
                {entry.CallStatus == "COMPLETED" && (
                  <CBadge color='success'>{entry.CallStatus}</CBadge>
                )}
                {entry.CallStatus == "REJECTED" && (
                  <CBadge color='danger'>{entry.CallStatus}</CBadge>
                )}
                {entry.CallStatus == "RESCHEDULED" && (
                  <CBadge color='secondary'>{entry.CallStatus}</CBadge>
                )}
              </CCol>
            </CRow>
            <CCardText>{entry.Description}</CCardText>
            {/* <CButton href="#">View</CButton> */}
          </CCardBody>
          <CCardFooter>
            <small className='text-medium-emphasis'>
              Created at {entry.CallCreatedAt}
            </small>
          </CCardFooter>
        </CCard>
      </CCol>
      {entry.JobId != "" && entry.JobId != undefined && (
        <CCol xs>
          <CCard>
            <CCardBody>
              <CRow>
                <CCol xs={9}>
                  <CCardTitle xs={10}>{entry.JobId}</CCardTitle>
                </CCol>
                <CCol
                  xs={3}
                  className='justify-center d-flex align-items-center'
                >
                  {entry.JobStatus == "Unscheduled" && (
                    <CBadge color='primary'>{entry.JobStatus}</CBadge>
                  )}
                  {(entry.JobStatus == "Scheduled" || entry.JobStatus == "Confirmed >") && (
                    <CBadge color='info'>{entry.JobStatus}</CBadge>
                  )}
                  {entry.JobStatus == "Canceled >" && (
                    <CBadge color='warning'>{entry.JobStatus}</CBadge>
                  )}
                  {(entry.JobStatus == "Completed >" || entry.JobStatus == "Invoiced") && (
                    <CBadge color='success'>{entry.JobStatus}</CBadge>
                  )}
                  {entry.JobStatus == "Rejected" && (
                    <CBadge color='danger'>{entry.JobStatus}</CBadge>
                  )}
                  {entry.JobStatus == "PI - Scheduled" && (
                    <CBadge color='secondary'>{entry.JobStatus}</CBadge>
                  )}
                </CCol>
              </CRow>
              <CCardText>{entry.JobNumber}</CCardText>
              {/* <CButton href="#">Go somewhere</CButton> */}
            </CCardBody>
            <CCardFooter>
              <small className='text-medium-emphasis'>
                Created at {entry.JobCreatedAt}
              </small>
            </CCardFooter>
          </CCard>
        </CCol>
      )}
    </CRow>
  );
};

CallInfoCard.propTypes = {
  entry: PropTypes.object.isRequired,
};

const Cards = () => {
  const [entries, setEntries] = useState([]);

  const updateCallAndJob = () => {
    const url =
      document.location.protocol +
      "//" +
      document.location.hostname +
      ":3479/getJobsAndCalls";
    console.log(" >>> url >>> ", url);
    axios
      .get(url, {
        params: {
          // startDate: yyyymmdd(date),
          // endDate: yyyymmdd(date)
          startDate: "20221202",
          endDate: "20221208",
        },
      })
      .then(function (response) {
        console.log(" >>> response >>> ", response.data);
        setEntries(response.data.result);
      })
      .catch(function (error) {
        console.log(" >>> error >>> ", error);
      })
      .finally(function () {});
  };

  useEffect(() => {
    const interval = setInterval(updateCallAndJob, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <CRow mt={1}>
      <CCol xs={12}>
        <CCard className='mb-4'>
          <CCardHeader className='text-center'>
            <strong>API</strong>{" "}
            <small>
              Bridge of <strong>ServicePower</strong> and{" "}
              <strong>Service Fusion</strong>
            </small>
          </CCardHeader>
          <CCardBody>
            {entries.map((entry, index) => {
              return <CallInfoCard key={index} entry={entry} />;
            })}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default Cards;
