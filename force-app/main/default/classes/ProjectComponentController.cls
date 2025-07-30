public with sharing class ProjectComponentController {
    
    @AuraEnabled(cacheable=true)
    public static ProjectData getProjectData() {
        try {
            ProjectData data = new ProjectData();
            
            // Get all funding applications
            List<Funding_Application__c> applications = [
                SELECT Id, Name, ApplicationStatus__c, CreatedDate, RequestType__c
                FROM Funding_Application__c
                ORDER BY CreatedDate DESC
            ];
            
            // Calculate counts
            Integer approvedCount = 0;
            Integer rejectedCount = 0;
            Integer revisionCount = 0;
            
            for (Funding_Application__c app : applications) {
                if (app.ApplicationStatus__c == 'Approved') {
                    approvedCount++;
                } else if (app.ApplicationStatus__c == 'Rejected') {
                    rejectedCount++;
                } else if (app.ApplicationStatus__c == 'Revisions requested') {
                    revisionCount++;
                }
            }
            
            data.approvedCount = approvedCount;
            data.rejectedCount = rejectedCount;
            data.revisionCount = revisionCount;
            data.totalCount = applications.size();
            data.applications = applications;
            
            return data;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving project data: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateApplication(Id applicationId, String status) {
        try {
            Funding_Application__c app = new Funding_Application__c(
                Id = applicationId,
                ApplicationStatus__c = status
            );
            update app;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating application: ' + e.getMessage());
        }
    }
    
    // Wrapper class for returning data
    public class ProjectData {
        @AuraEnabled public Integer approvedCount { get; set; }
        @AuraEnabled public Integer rejectedCount { get; set; }
        @AuraEnabled public Integer revisionCount { get; set; }
        @AuraEnabled public Integer totalCount { get; set; }
        @AuraEnabled public List<Funding_Application__c> applications { get; set; }
        
        public ProjectData() {
            this.approvedCount = 0;
            this.rejectedCount = 0;
            this.revisionCount = 0;
            this.totalCount = 0;
            this.applications = new List<Funding_Application__c>();
        }
    }

    @AuraEnabled
    public static Funding_Application__c getApplicationDetails(Id applicationId) {
        try {
            return [
                SELECT Id, Name, RequestType__c, DoesEntityApproveLineItems__c, ApplicationStatus__c, 
                       NameOfPersonCompletingForm__c, SCEISVendorNumber__c, EntityType__c, 
                       PleaseSpecifyOtherEntityType__c, CollaboratingWithOtherGPSEntity__c, 
                       Please_select_the_appropriate_county__c, IsEntityAnSCBellwetherPlaintiff__c, 
                       WasEntityALitigatingSubdivision__c, Any_Potential_Conflict_with_SC_Recovery__c, 
                       IdentifyTheBoardMemberAndRelation__c, PaymentRemitToAddressLine1__c, 
                       PaymentRemitToAddressLine2__c, PaymentRemitToCity__c, PaymentRemitToState__c, 
                       PaymentRemitToZip__c, AddressLine1__c, AddressLine2__c, City__c, State__c, 
                       Zip__c, ProgramManagerName__c, ProgramManagerPhoneNumber__c, 
                       ProgramManagerEmail__c, FiscalManagerTitle__c, FiscalManagerEmail__c, 
                       Total_Project_Budget__c, MinusEstimatedCarryForwardAmount__c, 
                       MinusEstimatedInterestEarned__c, Total_Amount_Requested__c,
                       FiscalManagerPhoneNumber__c
                FROM Funding_Application__c
                WHERE Id = :applicationId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving application details: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<PartnerData> getPartnerData(Id applicationId) {
        try {
            List<Abatement_Strategies__c> partners = [
                SELECT Id, PartnerName__c
                FROM Abatement_Strategies__c 
                WHERE Funding_Application__c = :applicationId
                ORDER BY CreatedDate
            ];
            
            List<PartnerData> partnerDataList = new List<PartnerData>();
            Integer serialNumber = 1;
            
            for (Abatement_Strategies__c partner : partners) {
                PartnerData pd = new PartnerData();
                pd.id = partner.Id;
                pd.partnerName = partner.PartnerName__c;
                pd.serialNumber = serialNumber++;
                partnerDataList.add(pd);
            }
            
            return partnerDataList;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving partner data: ' + e.getMessage());
        }
    }

    public class PartnerData {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String partnerName { get; set; }
        @AuraEnabled public Integer serialNumber { get; set; }
    }

    @AuraEnabled(cacheable=true)
    public static List<AbatementStrategyData> getAbatementStrategies(Id applicationId) {
        try {
            List<Abatement_Strategies__c> strategies = [
                SELECT Id, PartnerName__c, GeographicAreaPopulationPoverty__c, 
                       Outline_Existing_Efforts_and_New_Expansi__c, Describe_Current_Budget_and_Funding_Sour__c
                FROM Abatement_Strategies__c 
                WHERE Funding_Application__c = :applicationId
                ORDER BY CreatedDate
            ];
            
            List<AbatementStrategyData> strategyDataList = new List<AbatementStrategyData>();
            
            for (Abatement_Strategies__c strategy : strategies) {
                AbatementStrategyData data = new AbatementStrategyData();
                data.strategy = strategy;
                strategyDataList.add(data);
            }
            
            return strategyDataList;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving abatement strategies: ' + e.getMessage());
        }
    }

    // Updated wrapper class - no longer needs related lists
    public class AbatementStrategyData {
        @AuraEnabled public Abatement_Strategies__c strategy { get; set; }
    }
}