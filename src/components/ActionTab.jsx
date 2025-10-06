import React from 'react';
// Import all action button components
import Stage2ActionButton from './Stage2ActionButton';
import Stage3ActionButton from './Stage3ActionButton';
import Stage4ActionButton from './Stage4ActionButton';
import Stage5ActionButton from './Stage5ActionButton';
import Stage6ActionButton from './Stage6ActionButton';
import Stage7ActionButton from './Stage7ActionButton';
import Stage8ActionButton from './Stage8ActionButton';
import Stage9ActionButton from './Stage9ActionButton';

const ActionTab = ({
  selectedLead,
  sidebarFormData,
  stageStatuses,
  onStatusUpdate,
  getFieldLabel
}) => {
  return (
    <div className="lead-sidebar-tab-content">
      {/* Header Row */}
      <div className="lead-sidebar-action-header">
        <div>Stage Name</div>
        <div>Action</div>
        <div>Status</div>
        <div>R1</div>
        <div>R2</div>
      </div>

      {/* Stage Rows */}
      {/* Stage 2: Replied - NO R1/R2 */}
      <div className="lead-sidebar-action-row">
        <div className="lead-sidebar-action-stage">Stage 2 Replied</div>
        <div>
          <Stage2ActionButton
            leadId={selectedLead?.id}
            currentStatus={stageStatuses.stage2_status}
            onStatusUpdate={onStatusUpdate}
            getFieldLabel={getFieldLabel}
            alwaysVisible={true}
            parentsName={selectedLead?.parentsName}
            meetingDate={sidebarFormData.meetingDate}
            meetingTime={sidebarFormData.meetingTime}
            meetingLink={sidebarFormData.meetingLink}
            phone={selectedLead?.phone}
          />
        </div>
        <div>
          {stageStatuses.stage2_status === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {/* No R1 for Stage 2 */}
        </div>
        <div>
          {/* No R2 for Stage 2 */}
        </div>
      </div>

      {/* Stage 3: Call Booked - SHOW MEETING R1/R2 HERE */}
      <div className="lead-sidebar-action-row">
        <div className="lead-sidebar-action-stage">Stage 3 Call Booked</div>
        <div>
          <Stage4ActionButton
            leadId={selectedLead?.id}
            currentStatus={stageStatuses.stage4_status}
            onStatusUpdate={onStatusUpdate}
            getFieldLabel={getFieldLabel}
            alwaysVisible={true}
            parentsName={selectedLead?.parentsName}
            phone={selectedLead?.phone}
          />
        </div>
        <div>
          {stageStatuses.stage4_status === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {stageStatuses.stage2_r1 === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {stageStatuses.stage2_r2 === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
      </div>

      {/* Stage 4: Visit Booked - SHOW VISIT R1/R2 HERE */}
      <div className="lead-sidebar-action-row">
        <div className="lead-sidebar-action-stage">Stage 4 Visit Booked</div>
        <div>
          <Stage7ActionButton
            leadId={selectedLead?.id}
            currentStatus={stageStatuses.stage7_status}
            onStatusUpdate={onStatusUpdate}
            getFieldLabel={getFieldLabel}
            alwaysVisible={true}
            parentsName={selectedLead?.parentsName}
            visitDate={sidebarFormData.visitDate}
            phone={selectedLead?.phone}
          />
        </div>
        <div>
          {stageStatuses.stage7_status === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {stageStatuses.stage7_r1 === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {stageStatuses.stage7_r2 === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
      </div>

      {/* Stage 5: Registered */}
      <div className="lead-sidebar-action-row">
        <div className="lead-sidebar-action-stage">Stage 5 Registered</div>
        <div>
          <Stage8ActionButton
            leadId={selectedLead?.id}
            currentStatus={stageStatuses.stage8_status}
            onStatusUpdate={onStatusUpdate}
            getFieldLabel={getFieldLabel}  
            alwaysVisible={true}
            phone={selectedLead?.phone}
          />
        </div>
        <div>
          {stageStatuses.stage8_status === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {/* R1 content for Stage 8 */}
        </div>
        <div>
          {/* R2 content for Stage 8 */}
        </div>
      </div>

      {/* Stage 6: Admission */}
      <div className="lead-sidebar-action-row">
        <div className="lead-sidebar-action-stage">Stage 6 Admission</div>
        <div>
          <Stage9ActionButton
            leadId={selectedLead?.id}
            currentStatus={stageStatuses.stage9_status}
            onStatusUpdate={onStatusUpdate}
            getFieldLabel={getFieldLabel}
            alwaysVisible={true}
            kidsName={selectedLead?.kidsName}
            phone={selectedLead?.phone}
          />
        </div>
        <div>
          {stageStatuses.stage9_status === 'SENT' && (
            <span className="lead-sidebar-action-status">SENT</span>
          )}
        </div>
        <div>
          {/* R1 content for Stage 9 */}
        </div>
        <div>
          {/* R2 content for Stage 9 */}
        </div>
      </div>
    </div>
  );
};

export default ActionTab;