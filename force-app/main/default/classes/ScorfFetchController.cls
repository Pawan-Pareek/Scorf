public with sharing class ScorfFetchController {
    @AuraEnabled(cacheable=true)
    public static UserInfoWrapper ScorfFetchController() {
        User currentUser = [
            SELECT Id, Name, Email, MobilePhone
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        return new UserInfoWrapper(
            currentUser.Name,
            currentUser.Email,
            currentUser.MobilePhone
        );
    }

    public class UserInfoWrapper {
        @AuraEnabled public String name;
        @AuraEnabled public String email;
        @AuraEnabled public String MobilePhone;

        public UserInfoWrapper(String name, String email, String MobilePhone) {
            this.name = name;
            this.email = email;
            this.MobilePhone = MobilePhone;
        }
    }
}