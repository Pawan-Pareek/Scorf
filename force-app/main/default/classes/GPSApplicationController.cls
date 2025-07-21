public with sharing class GPSApplicationController {
    
    // Orginization Information Methods
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getPicklistValues() {
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
        
        return picklistMap;
    }
    
    private static List<Map<String, String>> getPicklistOptions(Schema.DescribeFieldResult fieldResult) {
        List<Map<String, String>> options = new List<Map<String, String>>();
        
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                options.add(new Map<String, String>{
                    'label' => entry.getLabel(),
                    'value' => entry.getValue()
                });
            }
        }
        
        return options;
    }
    
    @AuraEnabled
public static Funding_Application__c saveApplication(Funding_Application__c application) {
    system.debug('Received application data: ' + application);
    try {
        if (application.Id != null) {
            update application;
        } else {
            insert application;
        }
        return application;  // Return the record instead of 'Success'
    } catch (Exception e) {
        throw new AuraHandledException('Error saving application: ' + e.getMessage());
    }
}
    
    @AuraEnabled(cacheable=true)
    public static Funding_Application__c getApplication(Id recordId) {
        try {
            return [SELECT Id, RequestType__c, DoesEntityApproveLineItems__c, ApplicationStatus__c, 
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
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving application: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        delete [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId LIMIT 1];
    }


    // Technical Proposal Methods
     @AuraEnabled(cacheable=true)
    public static Abatement_Strategies__c fetchTechnicalProposalData(Id recordId) {
        if (String.isBlank(recordId)) return null;
        return [
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
    }

    @AuraEnabled
public static Abatement_Strategies__c saveTechnicalProposal(Abatement_Strategies__c abatement) {
    system.debug('Technical Proposal : '+ abatement);
    try {
        if (abatement.Id != null) {
            update abatement;
        } else {
            insert abatement;
        }
        return abatement;
    } catch (Exception e) {
        throw new AuraHandledException('Error saving technical proposal: ' + e.getMessage());
    }
}

//Abatement Strategy Methods
/**
     * Get Core Strategies picklist values
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getCoreStrategiesPicklist() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        
        try {
            // Get the describe result for CoreStrategies__c field
            Schema.DescribeFieldResult fieldResult = Abatement_Strategies__c.CoreStrategies__c.getDescribe();
            
            // Get picklist values
            for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
                if (entry.isActive()) {
                    options.add(new Map<String, String>{
                        'label' => entry.getLabel(),
                        'value' => entry.getValue()
                    });
                }
            }
            
            System.debug('Core Strategies Options: ' + options);
            
        } catch (Exception e) {
            System.debug('Error getting Core Strategies picklist values: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving Core Strategies: ' + e.getMessage());
        }
        
        return options;
    }
    
    /**
     * Get Core Abatement Strategies picklist values
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getCoreAbatementStrategiesPicklist() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        
        try {
            // Get the describe result for Core_Abatement_Strategies__c field
            Schema.DescribeFieldResult fieldResult = Abatement_Strategies__c.Core_Abatement_Strategies__c.getDescribe();
            
            // Get picklist values
            for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
                if (entry.isActive()) {
                    options.add(new Map<String, String>{
                        'label' => entry.getLabel(),
                        'value' => entry.getValue()
                    });
                }
            }
            
            System.debug('Core Abatement Strategies Options: ' + options);
            
        } catch (Exception e) {
            System.debug('Error getting Core Abatement Strategies picklist values: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving Core Abatement Strategies: ' + e.getMessage());
        }
        
        return options;
    }
    
    /**
     * Get filtered Core Abatement Strategies based on selected Core Strategies
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getFilteredAbatementStrategies(List<String> selectedCoreStrategies) {
        List<Map<String, String>> filteredOptions = new List<Map<String, String>>();
        
        try {
            if (selectedCoreStrategies == null || selectedCoreStrategies.isEmpty()) {
                return filteredOptions;
            }
            
            // Get all Core Abatement Strategies
            List<Map<String, String>> allAbatementStrategies = getCoreAbatementStrategiesPicklist();
            
            // Create a set of first characters from selected core strategies
            Set<String> allowedPrefixes = new Set<String>();
            for (String coreStrategy : selectedCoreStrategies) {
                if (String.isNotBlank(coreStrategy)) {
                    allowedPrefixes.add(coreStrategy.substring(0, 1).toUpperCase());
                }
            }
            
            // Filter abatement strategies based on matching prefixes
            for (Map<String, String> strategy : allAbatementStrategies) {
                String strategyValue = strategy.get('value');
                if (String.isNotBlank(strategyValue)) {
                    String firstChar = strategyValue.substring(0, 1).toUpperCase();
                    if (allowedPrefixes.contains(firstChar)) {
                        filteredOptions.add(strategy);
                    }
                }
            }
            
            System.debug('Filtered Abatement Strategies: ' + filteredOptions);
            
        } catch (Exception e) {
            System.debug('Error filtering abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Error filtering abatement strategies: ' + e.getMessage());
        }
        
        return filteredOptions;
    }
    
    /**
     * Save Abatement Strategy record
     */
    @AuraEnabled
    public static Abatement_Strategies__c saveAbatementStrategy(Abatement_Strategies__c abatement) {
        try {
            System.debug('Saving Abatement Strategy: ' + JSON.serializePretty(abatement));
            
            if (abatement.Id != null) {
                // Update existing record
                update abatement;
                System.debug('Updated Abatement Strategy with Id: ' + abatement.Id);
            } else {
                // Insert new record
                insert abatement;
                System.debug('Inserted new Abatement Strategy with Id: ' + abatement.Id);
            }
            
            return abatement;
            
        } catch (DmlException e) {
            System.debug('DML Error saving abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Database error: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('Error saving abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Error saving abatement strategy: ' + e.getMessage());
        }
    }
    
    /**
     * Save multiple Abatement Strategy records (for bulk operations)
     */
    @AuraEnabled
    public static List<Abatement_Strategies__c> saveAbatementStrategies(List<Abatement_Strategies__c> abatements) {
        try {
            System.debug('Saving multiple Abatement Strategies: ' + abatements.size() + ' records');
            
            List<Abatement_Strategies__c> toInsert = new List<Abatement_Strategies__c>();
            List<Abatement_Strategies__c> toUpdate = new List<Abatement_Strategies__c>();
            
            // Separate records for insert vs update
            for (Abatement_Strategies__c abatement : abatements) {
                if (abatement.Id != null) {
                    toUpdate.add(abatement);
                } else {
                    toInsert.add(abatement);
                }
            }
            
            // Perform DML operations
            if (!toInsert.isEmpty()) {
                insert toInsert;
                System.debug('Inserted ' + toInsert.size() + ' Abatement Strategy records');
            }
            
            if (!toUpdate.isEmpty()) {
                update toUpdate;
                System.debug('Updated ' + toUpdate.size() + ' Abatement Strategy records');
            }
            
            // Combine and return all records
            List<Abatement_Strategies__c> allRecords = new List<Abatement_Strategies__c>();
            allRecords.addAll(toInsert);
            allRecords.addAll(toUpdate);
            
            return allRecords;
            
        } catch (DmlException e) {
            System.debug('DML Error saving multiple abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Database error: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('Error saving multiple abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Error saving multiple abatement strategies: ' + e.getMessage());
        }
    }
    
    /**
     * Get existing Abatement Strategy record
     */
    @AuraEnabled(cacheable=true)
    public static Abatement_Strategies__c getAbatementStrategy(Id recordId) {
        try {
            if (recordId == null) {
                return null;
            }
            
            return [
                SELECT Id, 
                       CoreStrategies__c, 
                       Core_Abatement_Strategies__c,
                       Funding_Application__c,
                       PartnerName__c,
                       GeographicAreaPopulationPoverty__c,
                       Outline_Existing_Efforts_and_New_Expansi__c,
                       Describe_Current_Budget_and_Funding_Sour__c,
                       CreatedDate,
                       LastModifiedDate,
                       CreatedBy.Name,
                       LastModifiedBy.Name
                FROM Abatement_Strategies__c 
                WHERE Id = :recordId 
                LIMIT 1
            ];
            
        } catch (QueryException e) {
            System.debug('Query Error retrieving abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategy: ' + e.getMessage());
        } catch (Exception e) {
            System.debug('Error retrieving abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategy: ' + e.getMessage());
        }
    }
    
    /**
     * Get Abatement Strategy by Funding Application Id
     */
    @AuraEnabled(cacheable=true)
    public static Abatement_Strategies__c getAbatementStrategyByFundingApp(Id fundingApplicationId) {
        try {
            if (fundingApplicationId == null) {
                return null;
            }
            
            List<Abatement_Strategies__c> strategies = [
                SELECT Id, 
                       CoreStrategies__c, 
                       Core_Abatement_Strategies__c,
                       Funding_Application__c,
                       PartnerName__c,
                       GeographicAreaPopulationPoverty__c,
                       Outline_Existing_Efforts_and_New_Expansi__c,
                       Describe_Current_Budget_and_Funding_Sour__c,
                       CreatedDate,
                       LastModifiedDate,
                       CreatedBy.Name,
                       LastModifiedBy.Name
                FROM Abatement_Strategies__c 
                WHERE Funding_Application__c = :fundingApplicationId 
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            
            return strategies.isEmpty() ? null : strategies[0];
            
        } catch (QueryException e) {
            System.debug('Query Error retrieving abatement strategy by funding app: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategy: ' + e.getMessage());
        } catch (Exception e) {
            System.debug('Error retrieving abatement strategy by funding app: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategy: ' + e.getMessage());
        }
    }
    
    /**
     * Get all Abatement Strategies for a Funding Application
     */
    @AuraEnabled(cacheable=true)
    public static List<Abatement_Strategies__c> getAllAbatementStrategiesByFundingApp(Id fundingApplicationId) {
        try {
            if (fundingApplicationId == null) {
                return new List<Abatement_Strategies__c>();
            }
            
            return [
                SELECT Id, 
                       CoreStrategies__c, 
                       Core_Abatement_Strategies__c,
                       Funding_Application__c,
                       PartnerName__c,
                       GeographicAreaPopulationPoverty__c,
                       Outline_Existing_Efforts_and_New_Expansi__c,
                       Describe_Current_Budget_and_Funding_Sour__c,
                       CreatedDate,
                       LastModifiedDate,
                       CreatedBy.Name,
                       LastModifiedBy.Name
                FROM Abatement_Strategies__c 
                WHERE Funding_Application__c = :fundingApplicationId 
                ORDER BY CreatedDate DESC
            ];
            
        } catch (QueryException e) {
            System.debug('Query Error retrieving all abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategies: ' + e.getMessage());
        } catch (Exception e) {
            System.debug('Error retrieving all abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving abatement strategies: ' + e.getMessage());
        }
    }
    
    /**
     * Delete Abatement Strategy record
     */
    @AuraEnabled
    public static void deleteAbatementStrategy(Id recordId) {
        try {
            if (recordId == null) {
                throw new AuraHandledException('Record ID cannot be null');
            }
            
            Abatement_Strategies__c recordToDelete = [
                SELECT Id 
                FROM Abatement_Strategies__c 
                WHERE Id = :recordId 
                LIMIT 1
            ];
            
            delete recordToDelete;
            System.debug('Deleted Abatement Strategy with Id: ' + recordId);
            
        } catch (QueryException e) {
            System.debug('Query Error deleting abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Record not found or cannot be deleted');
        } catch (DmlException e) {
            System.debug('DML Error deleting abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Database error while deleting: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('Error deleting abatement strategy: ' + e.getMessage());
            throw new AuraHandledException('Error deleting abatement strategy: ' + e.getMessage());
        }
    }
    
    /**
     * Delete multiple Abatement Strategy records
     */
    @AuraEnabled
    public static void deleteAbatementStrategies(List<Id> recordIds) {
        try {
            if (recordIds == null || recordIds.isEmpty()) {
                throw new AuraHandledException('Record IDs cannot be null or empty');
            }
            
            List<Abatement_Strategies__c> recordsToDelete = [
                SELECT Id 
                FROM Abatement_Strategies__c 
                WHERE Id IN :recordIds
            ];
            
            if (recordsToDelete.isEmpty()) {
                throw new AuraHandledException('No records found to delete');
            }
            
            delete recordsToDelete;
            System.debug('Deleted ' + recordsToDelete.size() + ' Abatement Strategy records');
            
        } catch (QueryException e) {
            System.debug('Query Error deleting abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Records not found or cannot be deleted');
        } catch (DmlException e) {
            System.debug('DML Error deleting abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Database error while deleting: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('Error deleting abatement strategies: ' + e.getMessage());
            throw new AuraHandledException('Error deleting abatement strategies: ' + e.getMessage());
        }
    }
    
    /**
     * Validate strategy relationships - ensure selected abatement strategies align with core strategies
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> validateStrategyRelationships(List<String> coreStrategies, List<String> abatementStrategies) {
        Map<String, Object> result = new Map<String, Object>();
        List<String> errors = new List<String>();
        List<String> warnings = new List<String>();
        
        try {
            if (coreStrategies == null || coreStrategies.isEmpty()) {
                errors.add('At least one core strategy must be selected');
            } else {
                // Get allowed prefixes from core strategies
                Set<String> allowedPrefixes = new Set<String>();
                for (String coreStrategy : coreStrategies) {
                    if (String.isNotBlank(coreStrategy)) {
                        allowedPrefixes.add(coreStrategy.substring(0, 1).toUpperCase());
                    }
                }
                
                // Validate abatement strategies align with core strategies
                if (abatementStrategies != null && !abatementStrategies.isEmpty()) {
                    for (String abatementStrategy : abatementStrategies) {
                        if (String.isNotBlank(abatementStrategy)) {
                            String firstChar = abatementStrategy.substring(0, 1).toUpperCase();
                            if (!allowedPrefixes.contains(firstChar)) {
                                errors.add('Abatement strategy "' + abatementStrategy + '" does not align with selected core strategies');
                            }
                        }
                    }
                }
                
                // Check if all core strategies have corresponding abatement strategies
                if (abatementStrategies == null || abatementStrategies.isEmpty()) {
                    warnings.add('Consider selecting abatement strategies that align with your core strategies');
                } else {
                    Set<String> abatementPrefixes = new Set<String>();
                    for (String abatementStrategy : abatementStrategies) {
                        if (String.isNotBlank(abatementStrategy)) {
                            abatementPrefixes.add(abatementStrategy.substring(0, 1).toUpperCase());
                        }
                    }
                    
                    for (String prefix : allowedPrefixes) {
                        if (!abatementPrefixes.contains(prefix)) {
                            warnings.add('No abatement strategies selected for core strategy category "' + prefix + '"');
                        }
                    }
                }
            }
            
            result.put('isValid', errors.isEmpty());
            result.put('errors', errors);
            result.put('warnings', warnings);
            result.put('hasWarnings', !warnings.isEmpty());
            
        } catch (Exception e) {
            System.debug('Error validating strategy relationships: ' + e.getMessage());
            errors.add('Error during validation: ' + e.getMessage());
            result.put('isValid', false);
            result.put('errors', errors);
            result.put('warnings', warnings);
            result.put('hasWarnings', false);
        }
        
        return result;
    }
    
    /**
     * Get strategy statistics for reporting
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getStrategyStatistics(Id fundingApplicationId) {
        Map<String, Object> stats = new Map<String, Object>();
        
        try {
            if (fundingApplicationId == null) {
                return stats;
            }
            
            // Get all abatement strategies for this funding application
            List<Abatement_Strategies__c> strategies = getAllAbatementStrategiesByFundingApp(fundingApplicationId);
            
            Map<String, Integer> coreStrategyCount = new Map<String, Integer>();
            Map<String, Integer> abatementStrategyCount = new Map<String, Integer>();
            
            for (Abatement_Strategies__c strategy : strategies) {
                // Count core strategies
                if (String.isNotBlank(strategy.CoreStrategies__c)) {
                    List<String> coreStrategies = strategy.CoreStrategies__c.split(';');
                    for (String coreStrategy : coreStrategies) {
                        String trimmedStrategy = coreStrategy.trim();
                        if (String.isNotBlank(trimmedStrategy)) {
                            Integer currentCount = coreStrategyCount.get(trimmedStrategy);
                            coreStrategyCount.put(trimmedStrategy, (currentCount == null ? 0 : currentCount) + 1);
                        }
                    }
                }
                
                // Count abatement strategies
                if (String.isNotBlank(strategy.Core_Abatement_Strategies__c)) {
                    List<String> abatementStrategies = strategy.Core_Abatement_Strategies__c.split(';');
                    for (String abatementStrategy : abatementStrategies) {
                        String trimmedStrategy = abatementStrategy.trim();
                        if (String.isNotBlank(trimmedStrategy)) {
                            Integer currentCount = abatementStrategyCount.get(trimmedStrategy);
                            abatementStrategyCount.put(trimmedStrategy, (currentCount == null ? 0 : currentCount) + 1);
                        }
                    }
                }
            }
            
            stats.put('totalRecords', strategies.size());
            stats.put('coreStrategyCount', coreStrategyCount);
            stats.put('abatementStrategyCount', abatementStrategyCount);
            stats.put('uniqueCoreStrategies', coreStrategyCount.keySet().size());
            stats.put('uniqueAbatementStrategies', abatementStrategyCount.keySet().size());
            
        } catch (Exception e) {
            System.debug('Error getting strategy statistics: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving strategy statistics: ' + e.getMessage());
        }
        
        return stats;
    }

}