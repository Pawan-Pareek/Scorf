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
            System.debug('getAbatementStrategies START - Application ID: ' + applicationId);
            
            List<Abatement_Strategies__c> strategies = [
    SELECT Id, PartnerName__c, GeographicAreaPopulationPoverty__c, 
           Outline_Existing_Efforts_and_New_Expansi__c, Describe_Current_Budget_and_Funding_Sour__c,
           CoreStrategies__c, Core_Abatement_Strategies__c,
           (SELECT Id, Name__c,IsYourStrategyInitialContinuation__c, ImplementationPlanForTheStrategy__c,
                   ProvideTheProcessMeasures__c, ProvideTheOutcomeMeasures__c,
                   BudgetAmountForThePurchase__c, BudgetNarrative__c
            FROM Strategy_Line_Items__r),
           (SELECT Id,Strategy_Name__c,RecordType.Name, PersonnelName__c, PersonnelPosition__c, PersonnelTotalChargedToAward__c,
                   PersonnelLevelOfEffort__c, PersonnelKeyStaffAnnualSalary__c,
                   BudgetItem__c, BudgetPurpose__c, BudgetTotalChargedToAward__c, BudgetCalculation__c
            FROM Strategy_Resources__r)
    FROM Abatement_Strategies__c 
    WHERE Funding_Application__c = :applicationId
    ORDER BY CreatedDate
];
            
            System.debug('Found ' + strategies.size() + ' strategies');
            
            List<AbatementStrategyData> strategyDataList = new List<AbatementStrategyData>();
            
            for (Abatement_Strategies__c strategy : strategies) {
                System.debug('Strategy ID: ' + strategy.Id + ', Partner Name: ' + strategy.PartnerName__c);
                System.debug('Strategy Line Items Count: ' + (strategy.Strategy_Line_Items__r != null ? strategy.Strategy_Line_Items__r.size() : 0));
                System.debug('Strategy Resources Count: ' + (strategy.Strategy_Resources__r != null ? strategy.Strategy_Resources__r.size() : 0));
                
                if (strategy.Strategy_Resources__r != null && strategy.Strategy_Resources__r.size() > 0) {
                    for (Strategy_Resources__c resource : strategy.Strategy_Resources__r) {
                        System.debug('Resource ID: ' + resource.Id + ', Personnel Name: ' + resource.PersonnelName__c);
                    }
                }
                
                AbatementStrategyData data = new AbatementStrategyData();
                data.strategy = strategy;
                data.lineItems = strategy.Strategy_Line_Items__r;
                data.resources = strategy.Strategy_Resources__r;
                strategyDataList.add(data);
            }
            
            System.debug('getAbatementStrategies END - Returning ' + strategyDataList.size() + ' strategy data objects');
            return strategyDataList;
        } catch (Exception e) {
            System.debug('Error in getAbatementStrategies: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategies: ' + e.getMessage());
        }
    }

    // Updated wrapper class - no longer needs related lists
    public class AbatementStrategyData {
    @AuraEnabled public Abatement_Strategies__c strategy { get; set; }
    @AuraEnabled public List<Strategy_Line_Items__c> lineItems { get; set; }
    @AuraEnabled public List<Strategy_Resources__c> resources { get; set; }
    
    public AbatementStrategyData() {
        this.lineItems = new List<Strategy_Line_Items__c>();
        this.resources = new List<Strategy_Resources__c>();
    }
}

@AuraEnabled(cacheable=true)
public static List<DocumentData> getUploadedDocuments(Id applicationId) {
    try {
        List<ContentDocumentLink> documentLinks = [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension,
                   ContentDocument.ContentSize, ContentDocument.CreatedDate
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :applicationId
            ORDER BY ContentDocument.CreatedDate DESC
        ];
        
        List<DocumentData> documentDataList = new List<DocumentData>();
        
        for (ContentDocumentLink link : documentLinks) {
            DocumentData doc = new DocumentData();
            doc.id = link.ContentDocumentId;
            doc.name = link.ContentDocument.Title;
            doc.fileExtension = link.ContentDocument.FileExtension;
            doc.size = link.ContentDocument.ContentSize;
            doc.createdDate = link.ContentDocument.CreatedDate;
            documentDataList.add(doc);
        }
        
        return documentDataList;
    } catch (Exception e) {
        throw new AuraHandledException('Error retrieving uploaded documents: ' + e.getMessage());
    }
}

@AuraEnabled
public static String getDocumentDownloadUrl(Id documentId) {
    try {
        return '/sfc/servlet.shepherd/document/download/' + documentId;
    } catch (Exception e) {
        throw new AuraHandledException('Error getting document download URL: ' + e.getMessage());
    }
}

public class DocumentData {
    @AuraEnabled public Id id { get; set; }
    @AuraEnabled public String name { get; set; }
    @AuraEnabled public String fileExtension { get; set; }
    @AuraEnabled public Long size { get; set; }
    @AuraEnabled public DateTime createdDate { get; set; }
}
}