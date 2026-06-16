import React from "react";
import StaffLayout from "../components/StaffLayout";
import POAgingDashboard from "../components/POAgingDashboard";

export default function StaffPOAging(){

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const staffName = user?.fullName || localStorage.getItem('username') || 'Staff';

    return (
    <StaffLayout title="PO Aging Dashboard" staffName={staffName} staffData={user}>
      <POAgingDashboard />
    </StaffLayout>
  );
}