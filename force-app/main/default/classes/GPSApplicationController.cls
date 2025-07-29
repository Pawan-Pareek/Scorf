public with sharing class GPSApplicationController {
    
    // Orginization Information Methods
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getPicklistValues() {
        System.debug('getPicklistValues START');
        Map<String, Object> picklistMap = new Map<String, Object>();
        
        try {
            // Get object describe
            Schema.DescribeFieldResult requestTypeField = Funding_Application__c.RequestType__c.getDescribe();
            Schema.DescribeFieldResult entityApproveField = Funding_Application__c.DoesEntityApproveLineItems__c.getDescribe();
            Schema.DescribeFieldResult applicationStatusField = Funding_Application__c.ApplicationStatus__c.getDescribe();
            Schema.DescribeFieldResult entityTypeField = Funding_Application__c.EntityType__c.getDescribe();
            Schema.DescribeFieldResult collaboratingField = Funding_Application__c.CollaboratingWithOtherGPSEntity__c.getDescribe();
            Schema.DescribeFieldResult countyField = Funding_Application__c.Please_select_the_appropriate_county__c.getDescribe();
            Schema.DescribeFieldResult bellwetherField = Funding_Application__c.IsEntityAnSCBellwetherPlaintiff__c.getDescribe();
            Schema.DescribeFieldResult litigatingField = Funding_Application__c.WasEntityALitigatingSubdivision__c.getDescribe();
            Schema.DescribeFieldResult conflictField = Funding_Application__c.Any_Potential_Conflict_with_SC_Recovery__c.getDescribe();
            Schema.DescribeFieldResult stateField = Funding_Application__c.State__c.getDescribe();
            Schema.DescribeFieldResult paymentStateField = Funding_Application__c.PaymentRemitToState__c.getDescribe();
            
            // Get picklist values
            picklistMap.put('requestType', getPicklistOptions(requestTypeField));
            picklistMap.put('entityApprove', getPicklistOptions(entityApproveField));
            picklistMap.put('applicationStatus', getPicklistOptions(applicationStatusField));
            picklistMap.put('entityType', getPicklistOptions(entityTypeField));
            picklistMap.put('collaborating', getPicklistOptions(collaboratingField));
            picklistMap.put('county', getPicklistOptions(countyField));
            picklistMap.put('bellwether', getPicklistOptions(bellwetherField));
            picklistMap.put('litigating', getPicklistOptions(litigatingField));
            picklistMap.put('conflict', getPicklistOptions(conflictField));
            picklistMap.put('state', getPicklistOptions(stateField));
            picklistMap.put('paymentState', getPicklistOptions(paymentStateField));
            
        } catch (Exception e) {
            System.debug('Error getting picklist values: ' + e.getMessage());
        }
        System.debug('getPicklistValues END');
        return picklistMap;
    }
    
    private static List<Map<String, String>> getPicklistOptions(Schema.DescribeFieldResult fieldResult) {
        System.debug('getPicklistOptions START');
        List<Map<String, String>> options = new List<Map<String, String>>();
        
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                options.add(new Map<String, String>{
                    'label' => entry.getLabel(),
                    'value' => entry.getValue()
                });
            }
        }
        System.debug('getPicklistOptions END');
        return options;
    }
    
    @AuraEnabled
public static Funding_Application__c saveApplication(Funding_Application__c application) {
    System.debug('saveApplication START');
    System.debug('Received application data: ' + JSON.serialize(application));
    try {
        if (application.Id != null) {
            System.debug('Updating Funding_Application__c with Id: ' + application.Id);
            update application;
            System.debug('Update successful.');
        } else {
            System.debug('Inserting new Funding_Application__c');
            insert application;
            System.debug('Insert successful. New Id: ' + application.Id);
        }
        System.debug('saveApplication END');
        return application;  // Return the record instead of 'Success'
    } catch (Exception e) {
        System.debug('Exception in saveApplication: ' + e.getTypeName() + ' - ' + e.getMessage());
        System.debug('Exception stack trace: ' + e.getStackTraceString());
        throw new AuraHandledException('Error saving application: ' + e.getMessage());
    }
}
    
    @AuraEnabled(cacheable=true)
    public static Funding_Application__c getApplication(Id recordId) {
        System.debug('getApplication START');
        try {
            Funding_Application__c result = [SELECT Id, RequestType__c, DoesEntityApproveLineItems__c, ApplicationStatus__c, 
                    NameOfPersonCompletingForm__c, SCEISVendorNumber__c, EntityType__c, 
                    PleaseSpecifyOtherEntityType__c, CollaboratingWithOtherGPSEntity__c, 
                    Please_select_the_appropriate_county__c, IsEntityAnSCBellwetherPlaintiff__c, 
                    WasEntityALitigatingSubdivision__c, Any_Potential_Conflict_with_SC_Recovery__c, 
                    IdentifyTheBoardMemberAndRelation__c, PaymentRemitToAddressLine1__c, 
                    PaymentRemitToAddressLine2__c, PaymentRemitToCity__c, PaymentRemitToState__c, 
                    PaymentRemitToZip__c, AddressLine1__c, AddressLine2__c, City__c, State__c, 
                    Zip__c, ProgramManagerName__c, ProgramManagerPhoneNumber__c, 
                    ProgramManagerEmail__c, FiscalManagerTitle__c, FiscalManagerEmail__c, 
                    FiscalManagerPhoneNumber__c
                    FROM Funding_Application__c 
                    WHERE Id = :recordId];
            System.debug('getApplication END');
            return result;
        } catch (Exception e) {
            System.debug('Error retrieving application: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving application: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        System.debug('deleteFile START');
        delete [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId LIMIT 1];
        System.debug('deleteFile END');
    }


    // Technical Proposal Methods
     @AuraEnabled(cacheable=true)
    public static Abatement_Strategies__c fetchTechnicalProposalData(Id recordId) {
        System.debug('fetchTechnicalProposalData START');
        if (String.isBlank(recordId)) {
            System.debug('fetchTechnicalProposalData END');
            return null;
        }
        Abatement_Strategies__c result = [
            SELECT
                Id,
                PartnerName__c,
                GeographicAreaPopulationPoverty__c,
                Outline_Existing_Efforts_and_New_Expansi__c,
                Describe_Current_Budget_and_Funding_Sour__c
            FROM Abatement_Strategies__c
            WHERE Id = :recordId
            LIMIT 1
        ];
        System.debug('fetchTechnicalProposalData END');
        return result;
    }

    @AuraEnabled
public static Abatement_Strategies__c saveTechnicalProposal(Abatement_Strategies__c abatement) {
    System.debug('saveTechnicalProposal START');
    System.debug('Technical Proposal : '+ abatement);
    try {
        if (abatement.Id != null) {
            update abatement;
        } else {
            insert abatement;
        }

        System.debug('Technical Proposal saved: ' + abatement);
        System.debug('saveTechnicalProposal END');
        return abatement;
    } catch (Exception e) {
        System.debug('Error saving technical proposal: ' + e.getMessage());
        throw new AuraHandledException('Error saving technical proposal: ' + e.getMessage());
    }
}


// Abatement Strategies Methods
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getAbatementPicklistValues() {
        System.debug('getAbatementPicklistValues START');
        Map<String, Object> result = new Map<String, Object>();
        try {
            // Fetch Core Strategies picklist values dynamically
            Schema.DescribeFieldResult coreStrategiesField = Abatement_Strategies__c.CoreStrategies__c.getDescribe();
            List<Schema.PicklistEntry> coreStrategiesEntries = coreStrategiesField.getPicklistValues();
            List<Map<String, String>> coreStrategiesList = new List<Map<String, String>>();
            Map<String, Map<String, String>> coreStrategyMap = new Map<String, Map<String, String>>();
            for (Schema.PicklistEntry entry : coreStrategiesEntries) {
                if (entry.isActive()) {
                    Map<String, String> strategyMap = new Map<String, String>();
                    strategyMap.put('label', entry.getLabel());
                    strategyMap.put('value', entry.getValue());
                    coreStrategiesList.add(strategyMap);
                    // Use first character of value as key for mapping
                    String firstChar = entry.getValue().substring(0, 1).toUpperCase();
                    coreStrategyMap.put(firstChar, strategyMap);
                }
            }

            // Fetch Core Abatement Strategies picklist values dynamically
            Schema.DescribeFieldResult coreAbatementField = Abatement_Strategies__c.Core_Abatement_Strategies__c.getDescribe();
            List<Schema.PicklistEntry> coreAbatementEntries = coreAbatementField.getPicklistValues();
            Map<String, List<Map<String, String>>> mappedAbatementStrategies = new Map<String, List<Map<String, String>>>();
            for (Schema.PicklistEntry entry : coreAbatementEntries) {
                if (entry.isActive()) {
                    String value = entry.getValue();
                    String label = entry.getLabel();
                    String firstChar = value.substring(0, 1).toUpperCase();
                    if (coreStrategyMap.containsKey(firstChar)) {
                        String coreKey = coreStrategyMap.get(firstChar).get('value');
                        if (!mappedAbatementStrategies.containsKey(coreKey)) {
                            mappedAbatementStrategies.put(coreKey, new List<Map<String, String>>());
                        }
                        Map<String, String> abatementMap = new Map<String, String>();
                        abatementMap.put('label', label);
                        abatementMap.put('value', value);
                        mappedAbatementStrategies.get(coreKey).add(abatementMap);
                    }
                }
            }
            result.put('coreStrategies', coreStrategiesList);
            result.put('mappedAbatementStrategies', mappedAbatementStrategies);
            result.put('success', true);
        } catch (Exception e) {
            result.put('success', false);
            result.put('error', e.getMessage());
            System.debug('Error in getAbatementPicklistValues: ' + e.getMessage());
        }
        System.debug('getAbatementPicklistValues END');
        return result;
    }
    
    @AuraEnabled
public static Map<String, Object> saveAbatementStrategies(String abatement) {
    System.debug('saveAbatementStrategies START');
    Map<String, Object> result = new Map<String, Object>();
    try {
        System.debug('Received abatement data: ' + abatement);
        
        // Validate the input
        if (String.isBlank(abatement)) {
            result.put('success', false);
            result.put('error', 'No abatement data provided');
            return result;
        }

        // Handle double-escaped JSON (if present)
        Map<String, Object> dataMap;
        if (abatement.startsWith('"{') && abatement.endsWith('}"')) {
            // Remove the outer quotes and unescape inner quotes
            String innerJson = abatement.substring(1, abatement.length() - 1);
            innerJson = innerJson.replace('\\"', '"');
            dataMap = (Map<String, Object>) JSON.deserializeUntyped(innerJson);
        } else {
            dataMap = (Map<String, Object>) JSON.deserializeUntyped(abatement);
        }
        
        // Create the SObject
        Abatement_Strategies__c abatementRecord = new Abatement_Strategies__c();
        
        // Map the fields
        if (dataMap.containsKey('Id') && dataMap.get('Id') != null) {
            abatementRecord.Id = (String) dataMap.get('Id');
        }
        
        if (dataMap.containsKey('Funding_Application__c')) {
            abatementRecord.Funding_Application__c = (String) dataMap.get('Funding_Application__c');
        }
        
        // Handle CoreStrategies__c
        if (dataMap.containsKey('CoreStrategies__c')) {
            Object coreStrategies = dataMap.get('CoreStrategies__c');
            if (coreStrategies instanceof List<Object>) {
                List<String> strategiesList = new List<String>();
                for (Object strategy : (List<Object>) coreStrategies) {
                    strategiesList.add(String.valueOf(strategy));
                }
                abatementRecord.CoreStrategies__c = String.join(strategiesList, ';');
            } else if (coreStrategies != null) {
                abatementRecord.CoreStrategies__c = String.valueOf(coreStrategies);
            }
        }
        
        // Handle Core_Abatement_Strategies__c
        if (dataMap.containsKey('Core_Abatement_Strategies__c')) {
            Object coreAbatement = dataMap.get('Core_Abatement_Strategies__c');
            if (coreAbatement instanceof List<Object>) {
                List<String> abatementList = new List<String>();
                for (Object strategy : (List<Object>) coreAbatement) {
                    abatementList.add(String.valueOf(strategy));
                }
                abatementRecord.Core_Abatement_Strategies__c = String.join(abatementList, ';');
            } else if (coreAbatement != null) {
                abatementRecord.Core_Abatement_Strategies__c = String.valueOf(coreAbatement);
            }
        }
        
        // Handle other fields
        if (dataMap.containsKey('PartnerName__c') && dataMap.get('PartnerName__c') != null) {
            abatementRecord.PartnerName__c = String.valueOf(dataMap.get('PartnerName__c'));
        }
        
        if (dataMap.containsKey('GeographicAreaPopulationPoverty__c') && dataMap.get('GeographicAreaPopulationPoverty__c') != null) {
            abatementRecord.GeographicAreaPopulationPoverty__c = String.valueOf(dataMap.get('GeographicAreaPopulationPoverty__c'));
        }
        
        if (dataMap.containsKey('Outline_Existing_Efforts_and_New_Expansi__c') && dataMap.get('Outline_Existing_Efforts_and_New_Expansi__c') != null) {
            abatementRecord.Outline_Existing_Efforts_and_New_Expansi__c = String.valueOf(dataMap.get('Outline_Existing_Efforts_and_New_Expansi__c'));
        }
        
        if (dataMap.containsKey('Describe_Current_Budget_and_Funding_Sour__c') && dataMap.get('Describe_Current_Budget_and_Funding_Sour__c') != null) {
            abatementRecord.Describe_Current_Budget_and_Funding_Sour__c = String.valueOf(dataMap.get('Describe_Current_Budget_and_Funding_Sour__c'));
        }
        
        if (abatementRecord.Id != null) {
            System.debug('Updating existing record with Id: ' + abatementRecord.Id);
            update abatementRecord;
        } else {
            System.debug('Inserting new record');
            insert abatementRecord;
        }
        
        System.debug('Save successful. Record Id: ' + abatementRecord.Id);
        result.put('success', true);
        result.put('record', abatementRecord);
        result.put('message', 'Abatement strategies saved successfully');
        
    } catch (Exception e) {
        result.put('success', false);
        result.put('error', e.getMessage());
        System.debug('Error in saveAbatementStrategies: ' + e.getMessage());
        System.debug('Exception type: ' + e.getTypeName());
        System.debug('Stack trace: ' + e.getStackTraceString());
    }
    System.debug('saveAbatementStrategies END');
    return result;
}
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getAbatementStrategiesRecord(String recordId) {
        System.debug('getAbatementStrategiesRecord START');
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            if (String.isBlank(recordId)) {
                result.put('success', true);
                result.put('record', null);
                return result;
            }
            
            Abatement_Strategies__c record = [
                SELECT Id, CoreStrategies__c, Core_Abatement_Strategies__c, Funding_Application__c
                FROM Abatement_Strategies__c 
                WHERE Id = :recordId 
                LIMIT 1
            ];
            
            Map<String, Object> recordData = new Map<String, Object>();
            recordData.put('Id', record.Id);
            recordData.put('CoreStrategies__c', record.CoreStrategies__c != null ? record.CoreStrategies__c.split(';') : new List<String>());
            recordData.put('Core_Abatement_Strategies__c', record.Core_Abatement_Strategies__c != null ? record.Core_Abatement_Strategies__c.split(';') : new List<String>());
            recordData.put('Funding_Application__c', record.Funding_Application__c);
            
            result.put('success', true);
            result.put('record', recordData);
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('error', e.getMessage());
            System.debug('Error in getAbatementStrategiesRecord: ' + e.getMessage());
        }
        System.debug('getAbatementStrategiesRecord END');
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getStrategyLineItems(String abatementId) {
        System.debug('getStrategyLineItems START');
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            if (String.isBlank(abatementId)) {
                result.put('success', true);
                result.put('strategyLineItems', new Map<String, Object>());
                return result;
            }
            
            List<Strategy_Line_Items__c> lineItems = [
                SELECT Id, Name__c, BudgetAmountForThePurchase__c, IsYourStrategyInitialContinuation__c,
                       BudgetNarrative__c, ImplementationPlanForTheStrategy__c, ProvideTheOutcomeMeasures__c,
                       ProvideTheProcessMeasures__c
                FROM Strategy_Line_Items__c 
                WHERE Abatement_Strategies__c = :abatementId
            ];
            
            Map<String, Object> strategyLineItemsMap = new Map<String, Object>();
            for (Strategy_Line_Items__c item : lineItems) {
                Map<String, Object> itemData = new Map<String, Object>();
                itemData.put('Id', item.Id);
                itemData.put('Strategy_Value__c', item.Name__c);
                itemData.put('BudgetAmountForThePurchase__c', item.BudgetAmountForThePurchase__c);
                itemData.put('IsYourStrategyInitialContinuation__c', item.IsYourStrategyInitialContinuation__c);
                itemData.put('BudgetNarrative__c', item.BudgetNarrative__c);
                itemData.put('ImplementationPlanForTheStrategy__c', item.ImplementationPlanForTheStrategy__c);
                itemData.put('ProvideTheOutcomeMeasures__c', item.ProvideTheOutcomeMeasures__c);
                itemData.put('ProvideTheProcessMeasures__c', item.ProvideTheProcessMeasures__c);
                
                strategyLineItemsMap.put(item.Name__c, itemData);
            }
            
            result.put('success', true);
            result.put('strategyLineItems', strategyLineItemsMap);
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('error', e.getMessage());
            System.debug('Error in getStrategyLineItems: ' + e.getMessage());
        }
        System.debug('getStrategyLineItems END');
        return result;
    }

    @AuraEnabled
    public static Map<String, Object> saveStrategyLineItems(String abatementId, String lineItemsJson) {
        System.debug('saveStrategyLineItems START' + abatementId + ' ' + lineItemsJson);
        Map<String, Object> result = new Map<String, Object>();
        List<Strategy_Line_Items__c> itemsToUpsert = new List<Strategy_Line_Items__c>();
        Map<String, String> strategyToIdMap = new Map<String, String>(); // Map strategy value to record ID
        try {
            Map<String, Object> lineItemsMap = (Map<String, Object>) JSON.deserializeUntyped(lineItemsJson);
            System.debug('lineItemsMap: ' + lineItemsMap);
            for (String key : lineItemsMap.keySet()) {
                Map<String, Object> itemData = (Map<String, Object>)lineItemsMap.get(key);
                Strategy_Line_Items__c sli = new Strategy_Line_Items__c();
                
                // Set Id if it exists and is valid
                if (itemData.containsKey('Id')) {
                    String idVal = (String)itemData.get('Id');
                    if (idVal != null && (idVal.length() == 15 || idVal.length() == 18) && Pattern.matches('^[a-zA-Z0-9]+$', idVal)) {
                        sli.Id = idVal;
                    }
                }
                
                // Map Strategy_Value__c to Name__c
                if (itemData.containsKey('Strategy_Value__c')) {
                    sli.Name__c = (String)itemData.get('Strategy_Value__c');
                } else {
                    sli.Name__c = key;
                }
                // Always set the abatement strategy record id
                sli.Abatement_Strategies__c = abatementId;
                if (itemData.containsKey('BudgetAmountForThePurchase__c'))
                    sli.BudgetAmountForThePurchase__c = (itemData.get('BudgetAmountForThePurchase__c') != null) ? Decimal.valueOf(String.valueOf(itemData.get('BudgetAmountForThePurchase__c'))) : null;
                if (itemData.containsKey('IsYourStrategyInitialContinuation__c'))
                    sli.IsYourStrategyInitialContinuation__c = (String)itemData.get('IsYourStrategyInitialContinuation__c');
                if (itemData.containsKey('BudgetNarrative__c'))
                    sli.BudgetNarrative__c = (String)itemData.get('BudgetNarrative__c');
                if (itemData.containsKey('ImplementationPlanForTheStrategy__c'))
                    sli.ImplementationPlanForTheStrategy__c = (String)itemData.get('ImplementationPlanForTheStrategy__c');
                if (itemData.containsKey('ProvideTheOutcomeMeasures__c'))
                    sli.ProvideTheOutcomeMeasures__c = (String)itemData.get('ProvideTheOutcomeMeasures__c');
                if (itemData.containsKey('ProvideTheProcessMeasures__c'))
                    sli.ProvideTheProcessMeasures__c = (String)itemData.get('ProvideTheProcessMeasures__c');
                // Do not use Strategy_Value__c as a field
                itemsToUpsert.add(sli);
            }
            upsert itemsToUpsert;
            
            // Create mapping of strategy value to record ID
            for (Strategy_Line_Items__c item : itemsToUpsert) {
                strategyToIdMap.put(item.Name__c, item.Id);
            }
            
            result.put('success', true);
            result.put('message', 'Strategy Line Items saved successfully');
            result.put('strategyToIdMap', strategyToIdMap);
        } catch (Exception e) {
            result.put('success', false);
            result.put('error', e.getMessage());
            System.debug('Error in saveStrategyLineItems: ' + e.getMessage());
        }
        System.debug('saveStrategyLineItems END');
        return result;
    }

    /**
     * Save a list of Strategy_Resources__c records with correct record type and fields.
     * Accepts a JSON string or List<Map<String, Object>> from LWC.
     * Each record must include a RecordTypeName ("Budget Information" or "Personnel Information") and Strategy_Name__c.
     */
    @AuraEnabled
public static Map<String, Object> saveStrategyResources(String resourcesJson) {
    System.debug('saveStrategyResources START');
    Map<String, Object> result = new Map<String, Object>();
    List<String> insertedIds = new List<String>(); // Track inserted IDs
    
    try {
        System.debug('Received resourcesJson: ' + resourcesJson);
        if (String.isBlank(resourcesJson)) {
            result.put('success', false);
            result.put('error', 'No resource data provided');
            return result;
        }
        
        // Parse JSON
        List<Object> resourceList = (List<Object>) JSON.deserializeUntyped(resourcesJson);
        if (resourceList.isEmpty()) {
            result.put('success', false);
            result.put('error', 'No resource records found');
            return result;
        }
        
        // Get RecordTypeId map
        Map<String, Id> recordTypeMap = new Map<String, Id>();
        for (RecordType rt : [SELECT Id, Name FROM RecordType WHERE SObjectType = 'Strategy_Resources__c']) {
            recordTypeMap.put(rt.Name, rt.Id);
        }
        
        List<Strategy_Resources__c> toUpsert = new List<Strategy_Resources__c>();
        for (Object rowObj : resourceList) {
            Map<String, Object> row = (Map<String, Object>)rowObj;
            Strategy_Resources__c rec = new Strategy_Resources__c();
            
            // Only set Id if it's a valid Salesforce Id
            if (row.containsKey('Id')) {
                String idVal = (String)row.get('Id');
                if (idVal != null && (idVal.length() == 15 || idVal.length() == 18) && Pattern.matches('^[a-zA-Z0-9]+$', idVal)) {
                    rec.Id = idVal;
                }
            }
            
            // Set RecordTypeId
            if (row.containsKey('RecordTypeName') && recordTypeMap.containsKey((String)row.get('RecordTypeName')))
                rec.RecordTypeId = recordTypeMap.get((String)row.get('RecordTypeName'));
            
            // Set Strategy_Name__c
            if (row.containsKey('Strategy_Name__c'))
                rec.Strategy_Name__c = (String)row.get('Strategy_Name__c');
            
            // Set Abatement_Strategies__c (lookup to parent)
            if (row.containsKey('Abatement_Strategies__c'))
                rec.Abatement_Strategies__c = (String)row.get('Abatement_Strategies__c');
            
            // Map all other fields (skip RecordTypeName, Strategy_Name__c, Abatement_Strategies__c, Id)
            for (String key : row.keySet()) {
                if (key == 'RecordTypeName' || key == 'Strategy_Name__c' || key == 'Abatement_Strategies__c' || key == 'Id') continue;
                SObjectField f = Strategy_Resources__c.SObjectType.getDescribe().fields.getMap().get(key);
                if (f != null && row.get(key) != null) {
                    // Convert to Decimal for currency fields
                    if (key == 'BudgetTotalChargedToAward__c' || key == 'PersonnelTotalChargedToAward__c' || key == 'PersonnelKeyStaffAnnualSalary__c') {
                        rec.put(f, Decimal.valueOf(String.valueOf(row.get(key))));
                    } else {
                        rec.put(f, row.get(key));
                    }
                }
            }
            toUpsert.add(rec);
        }
        
        System.debug('Prepared toUpsert list: ' + toUpsert);
        upsert toUpsert;
        
        // Collect inserted IDs
        for (Strategy_Resources__c resource : toUpsert) {
            insertedIds.add(resource.Id);
        }
        
        result.put('success', true);
        result.put('message', toUpsert.size() + ' Strategy_Resources__c records saved');
        result.put('insertedIds', insertedIds); // Return the IDs
        
    } catch (Exception e) {
        result.put('success', false);
        result.put('error', e.getMessage());
        System.debug('Error in saveStrategyResources: ' + e.getMessage());
    }
    
    System.debug('saveStrategyResources END');
    return result;
}


}