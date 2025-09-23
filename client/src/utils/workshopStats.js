/**
 * Utility functions for workshop statistics and quota tracking
 * Based on selectedWorkshops (checkboxes) as the priority indicator
 */

/**
 * Calculates workshop selection statistics from fiches data
 * @param {Array} fiches - Array of fiche objects with selectedWorkshops
 * @param {Array} workshops - Array of workshop objects with id, name, objectiveId
 * @param {Array} organizations - Array of organization objects
 * @returns {Object} Workshop statistics by organization and workshop
 */
export function calculateWorkshopStats(fiches = [], workshops = [], organizations = []) {
  const stats = {
    totalSelectedWorkshops: 0,
    byOrganization: {},
    byWorkshop: {},
    byObjective: {},
    quotaAlerts: []
  };

  // Initialize organization stats
  organizations.forEach(org => {
    stats.byOrganization[org.orgId] = {
      orgId: org.orgId,
      name: org.name,
      totalSelections: 0,
      workshopCounts: {},
      objectiveCounts: {}
    };
  });

  // Initialize workshop stats
  workshops.forEach(workshop => {
    stats.byWorkshop[workshop.id] = {
      workshopId: workshop.id,
      name: workshop.name,
      objectiveId: workshop.objectiveId,
      totalSelections: 0,
      byOrganization: {}
    };
  });

  // Process each fiche
  fiches.forEach(fiche => {
    const selectedWorkshops = fiche.selectedWorkshops || {};
    const assignedOrgId = fiche.assignedOrgId;

    // Count only checked workshops (priority indicator)
    Object.entries(selectedWorkshops).forEach(([workshopId, isSelected]) => {
      if (isSelected) {
        stats.totalSelectedWorkshops++;

        // Find workshop details
        const workshop = workshops.find(w => w.id === workshopId);
        if (!workshop) return;

        // Update global workshop stats
        if (stats.byWorkshop[workshopId]) {
          stats.byWorkshop[workshopId].totalSelections++;
          
          if (assignedOrgId) {
            if (!stats.byWorkshop[workshopId].byOrganization[assignedOrgId]) {
              stats.byWorkshop[workshopId].byOrganization[assignedOrgId] = 0;
            }
            stats.byWorkshop[workshopId].byOrganization[assignedOrgId]++;
          }
        }

        // Update organization stats
        if (assignedOrgId && stats.byOrganization[assignedOrgId]) {
          stats.byOrganization[assignedOrgId].totalSelections++;
          
          // Count by workshop
          if (!stats.byOrganization[assignedOrgId].workshopCounts[workshopId]) {
            stats.byOrganization[assignedOrgId].workshopCounts[workshopId] = 0;
          }
          stats.byOrganization[assignedOrgId].workshopCounts[workshopId]++;

          // Count by objective
          const objectiveId = workshop.objectiveId;
          if (!stats.byOrganization[assignedOrgId].objectiveCounts[objectiveId]) {
            stats.byOrganization[assignedOrgId].objectiveCounts[objectiveId] = 0;
          }
          stats.byOrganization[assignedOrgId].objectiveCounts[objectiveId]++;
        }

        // Update objective stats
        const objectiveId = workshop.objectiveId;
        if (!stats.byObjective[objectiveId]) {
          stats.byObjective[objectiveId] = {
            objectiveId,
            totalSelections: 0,
            byOrganization: {},
            workshopCounts: {}
          };
        }
        stats.byObjective[objectiveId].totalSelections++;
        
        if (assignedOrgId) {
          if (!stats.byObjective[objectiveId].byOrganization[assignedOrgId]) {
            stats.byObjective[objectiveId].byOrganization[assignedOrgId] = 0;
          }
          stats.byObjective[objectiveId].byOrganization[assignedOrgId]++;
        }
      }
    });
  });

  return stats;
}

/**
 * Checks for quota alerts based on workshop selection limits
 * @param {Object} stats - Workshop statistics from calculateWorkshopStats
 * @param {Object} quotaLimits - Quota limits configuration
 * @returns {Array} Array of quota alert objects
 */
export function checkQuotaAlerts(stats, quotaLimits = {}) {
  const alerts = [];

  // Check workshop limits
  Object.values(stats.byWorkshop).forEach(workshop => {
    const limit = quotaLimits.workshops?.[workshop.workshopId];
    if (limit && workshop.totalSelections >= limit * 0.8) { // Alert at 80% capacity
      alerts.push({
        type: 'workshop',
        level: workshop.totalSelections >= limit ? 'critical' : 'warning',
        workshopId: workshop.workshopId,
        workshopName: workshop.name,
        current: workshop.totalSelections,
        limit: limit,
        message: `L'atelier "${workshop.name}" approche de sa limite (${workshop.totalSelections}/${limit})`
      });
    }
  });

  // Check organization limits
  Object.values(stats.byOrganization).forEach(org => {
    const limit = quotaLimits.organizations?.[org.orgId];
    if (limit && org.totalSelections >= limit * 0.8) {
      alerts.push({
        type: 'organization',
        level: org.totalSelections >= limit ? 'critical' : 'warning',
        orgId: org.orgId,
        orgName: org.name,
        current: org.totalSelections,
        limit: limit,
        message: `L'organisation "${org.name}" approche de sa limite (${org.totalSelections}/${limit})`
      });
    }
  });

  return alerts;
}

/**
 * Generates a summary for admin dashboard
 * @param {Object} stats - Workshop statistics from calculateWorkshopStats
 * @returns {Object} Dashboard summary
 */
export function generateDashboardSummary(stats) {
  const topWorkshops = Object.values(stats.byWorkshop)
    .sort((a, b) => b.totalSelections - a.totalSelections)
    .slice(0, 5);

  const topOrganizations = Object.values(stats.byOrganization)
    .filter(org => org.totalSelections > 0)
    .sort((a, b) => b.totalSelections - a.totalSelections)
    .slice(0, 5);

  return {
    totalSelectedWorkshops: stats.totalSelectedWorkshops,
    totalActiveOrganizations: Object.values(stats.byOrganization).filter(org => org.totalSelections > 0).length,
    topWorkshops,
    topOrganizations,
    criticalAlerts: stats.quotaAlerts?.filter(alert => alert.level === 'critical').length || 0,
    warningAlerts: stats.quotaAlerts?.filter(alert => alert.level === 'warning').length || 0
  };
}