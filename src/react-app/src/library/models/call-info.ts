export default class CallInfo {
  conversationId: string;
  contactName: string;

  constructor(conversationId: string, contactName: string) {
    this.conversationId = conversationId;
    this.contactName = contactName;
  }
}
