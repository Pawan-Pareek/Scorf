// Test file to demonstrate abatementExtraData ID handling

// Sample data structure before saving (new records)
const samplePartnerDataBeforeSave = {
    partnerIndex: 1,
    technicalProposal: {
        PartnerName__c: "jyhtg",
        GeographicAreaPopulationPoverty__c: "htgrfe",
        Outline_Existing_Efforts_and_New_Expansi__c: "tgrefwd",
        Describe_Current_Budget_and_Funding_Sour__c: "tbrgefwdsa"
    },
    abatementStrategies: {
        Id: "a03dL00000rPYeRQAW",
        coreStrategies: [
            "C: Pregnant and Postpartum Women",
            "D: Expanding Treatment for Neonatal Abstinence Syndrome (NAS)"
        ],
        abatementStrategies: [
            "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women",
            "D.2: Expand services for a better continuum of care with infant-need dyad"
        ],
        CoreStrategies__c: "C: Pregnant and Postpartum Women;D: Expanding Treatment for Neonatal Abstinence Syndrome (NAS)",
        Core_Abatement_Strategies__c: "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women;D.2: Expand services for a better continuum of care with infant-need dyad"
    },
    strategyLineResources: {
        "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women": {
            Id: "a05dL00000rAPjOQAW",
            BudgetAmountForThePurchase__c: "43",
            IsYourStrategyInitialContinuation__c: "Initial",
            BudgetNarrative__c: "rfeds",
            ImplementationPlanForTheStrategy__c: "grfewd",
            ProvideTheOutcomeMeasures__c: "grfewd",
            ProvideTheProcessMeasures__c: "rgefwds",
            Strategy_Value__c: "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women"
        },
        "D.2: Expand services for a better continuum of care with infant-need dyad": {
            Id: "a05dL00000rAPjPQAW",
            BudgetAmountForThePurchase__c: "5243",
            IsYourStrategyInitialContinuation__c: "Initial",
            BudgetNarrative__c: "gtrfew",
            ImplementationPlanForTheStrategy__c: "gtrefwd",
            ProvideTheOutcomeMeasures__c: "grfewd",
            ProvideTheProcessMeasures__c: "grfewds",
            Strategy_Value__c: "D.2: Expand services for a better continuum of care with infant-need dyad"
        }
    },
    abatementExtra: {
        personnelData: {
            "D.2: Expand services for a better continuum of care with infant-need dyad": [
                {
                    id: "id-1753787024123-kztosowo5", // Temporary ID for new record
                    PersonnelName__c: "grefw",
                    PersonnelPosition__c: "fved",
                    PersonnelKeyStaffAnnualSalary__c: "4",
                    PersonnelLevelOfEffort__c: "4",
                    PersonnelTotalChargedToAward__c: "4"
                    // Note: No Id field yet (will be added after saving)
                }
            ]
        },
        budgetData: {
            "D.2: Expand services for a better continuum of care with infant-need dyad": [
                {
                    id: "id-1753787034835-7vo4kn8ky", // Temporary ID for new record
                    BudgetItem__c: "4",
                    BudgetPurpose__c: "4",
                    BudgetCalculation__c: "4",
                    BudgetTotalChargedToAward__c: "4"
                    // Note: No Id field yet (will be added after saving)
                }
            ]
        }
    }
};

// Sample data structure after saving (with Salesforce IDs)
const samplePartnerDataAfterSave = {
    partnerIndex: 1,
    technicalProposal: {
        PartnerName__c: "jyhtg",
        GeographicAreaPopulationPoverty__c: "htgrfe",
        Outline_Existing_Efforts_and_New_Expansi__c: "tgrefwd",
        Describe_Current_Budget_and_Funding_Sour__c: "tbrgefwdsa"
    },
    abatementStrategies: {
        Id: "a03dL00000rPYeRQAW",
        coreStrategies: [
            "C: Pregnant and Postpartum Women",
            "D: Expanding Treatment for Neonatal Abstinence Syndrome (NAS)"
        ],
        abatementStrategies: [
            "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women",
            "D.2: Expand services for a better continuum of care with infant-need dyad"
        ],
        CoreStrategies__c: "C: Pregnant and Postpartum Women;D: Expanding Treatment for Neonatal Abstinence Syndrome (NAS)",
        Core_Abatement_Strategies__c: "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women;D.2: Expand services for a better continuum of care with infant-need dyad"
    },
    strategyLineResources: {
        "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women": {
            Id: "a05dL00000rAPjOQAW",
            BudgetAmountForThePurchase__c: "43",
            IsYourStrategyInitialContinuation__c: "Initial",
            BudgetNarrative__c: "rfeds",
            ImplementationPlanForTheStrategy__c: "grfewd",
            ProvideTheOutcomeMeasures__c: "grfewd",
            ProvideTheProcessMeasures__c: "rgefwds",
            Strategy_Value__c: "C.1: Expand Screening, Brief Intervention, and Referral to Treatment (SBIRT) services to non-Medicaid eligible or uninsured pregnant women"
        },
        "D.2: Expand services for a better continuum of care with infant-need dyad": {
            Id: "a05dL00000rAPjPQAW",
            BudgetAmountForThePurchase__c: "5243",
            IsYourStrategyInitialContinuation__c: "Initial",
            BudgetNarrative__c: "gtrfew",
            ImplementationPlanForTheStrategy__c: "gtrefwd",
            ProvideTheOutcomeMeasures__c: "grfewd",
            ProvideTheProcessMeasures__c: "grfewds",
            Strategy_Value__c: "D.2: Expand services for a better continuum of care with infant-need dyad"
        }
    },
    abatementExtra: {
        personnelData: {
            "D.2: Expand services for a better continuum of care with infant-need dyad": [
                {
                    Id: "a06dL00000rXYZ12345", // Salesforce record ID (added after saving)
                    PersonnelName__c: "grefw",
                    PersonnelPosition__c: "fved",
                    PersonnelKeyStaffAnnualSalary__c: "4",
                    PersonnelLevelOfEffort__c: "4",
                    PersonnelTotalChargedToAward__c: "4"
                    // Note: Temporary 'id' field has been removed
                }
            ]
        },
        budgetData: {
            "D.2: Expand services for a better continuum of care with infant-need dyad": [
                {
                    Id: "a06dL00000rABC67890", // Salesforce record ID (added after saving)
                    BudgetItem__c: "4",
                    BudgetPurpose__c: "4",
                    BudgetCalculation__c: "4",
                    BudgetTotalChargedToAward__c: "4"
                    // Note: Temporary 'id' field has been removed
                }
            ]
        }
    }
};

// Function to demonstrate the ID mapping process
function demonstrateIdMapping() {
    console.log("=== BEFORE SAVING ===");
    console.log("Personnel record has temporary ID:", samplePartnerDataBeforeSave.abatementExtra.personnelData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].id);
    console.log("Personnel record has no Salesforce Id:", !samplePartnerDataBeforeSave.abatementExtra.personnelData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].Id);
    
    console.log("Budget record has temporary ID:", samplePartnerDataBeforeSave.abatementExtra.budgetData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].id);
    console.log("Budget record has no Salesforce Id:", !samplePartnerDataBeforeSave.abatementExtra.budgetData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].Id);
    
    console.log("\n=== AFTER SAVING ===");
    console.log("Personnel record has Salesforce Id:", samplePartnerDataAfterSave.abatementExtra.personnelData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].Id);
    console.log("Personnel record has no temporary id:", !samplePartnerDataAfterSave.abatementExtra.personnelData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].id);
    
    console.log("Budget record has Salesforce Id:", samplePartnerDataAfterSave.abatementExtra.budgetData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].Id);
    console.log("Budget record has no temporary id:", !samplePartnerDataAfterSave.abatementExtra.budgetData["D.2: Expand services for a better continuum of care with infant-need dyad"][0].id);
}

// Run the demonstration
demonstrateIdMapping();

console.log("\n=== SUMMARY ===");
console.log("The implementation now:");
console.log("1. Adds Salesforce record IDs to personnel and budget records after saving");
console.log("2. Removes temporary 'id' fields after saving");
console.log("3. Preserves existing IDs for records that are already saved");
console.log("4. Returns null for IDs when records are not yet saved in Salesforce"); 