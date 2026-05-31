
/**
 * @name UrgentNotification
 * @description Allow urgent messages to bypass Do Not Disturb and notify you instantly.
 * @version 1.0.0-modern
 * @author YuzuZensai (modernized)
 */

const config = {
    info: {
        name: "UrgentNotification",
        version: "1.0.0-modern",
        description: "Modern urgent notification plugin",
    }
};

class Dummy {
    start() {}
    stop() {}
}

// Safe modal (new + old BD support)
const showModal =
    BdApi?.UI?.showConfirmationModal ||
    BdApi?.showConfirmationModal ||
    ((title, content) => alert(title + "\n\n" + content));

// Library check
if (!global.ZeresPluginLibrary) {
    showModal("Library Missing",
        "ZeresPluginLibrary is required. Click Download Now.",
        {
            confirmText: "Download",
            cancelText: "Cancel",
            onConfirm: () => {
                require("electron").shell.openExternal(
                    "https://betterdiscord.app/Download?id=9"
                );
            }
        }
    );
}

module.exports = !global.ZeresPluginLibrary
    ? Dummy
    : (([Plugin, Api]) => {
        const { Logger, WebpackModules } = Api;

        // Safe module grabbing (prevents crashes if Discord updates)
        const Dispatcher = WebpackModules.getByProps("subscribe", "dispatch");
        const UserStore = WebpackModules.getByProps("getCurrentUser");
        const ChannelStore = WebpackModules.getByProps("getChannel");
        const NotificationModule = WebpackModules.getByProps("showNotification");
        const NavigationUtils = WebpackModules.getByProps("transitionTo");

        return class UrgentNotification extends Plugin {

            onStart() {
                Logger.log("UrgentNotification started");

                this.messageHandler = this.onMessage.bind(this);

                if (!Dispatcher) {
                    Logger.error("Dispatcher not found");
                    return;
                }

                Dispatcher.subscribe("MESSAGE_CREATE", this.messageHandler);
            }

            onStop() {
                if (Dispatcher && this.messageHandler) {
                    Dispatcher.unsubscribe("MESSAGE_CREATE", this.messageHandler);
                }

                Logger.log("UrgentNotification stopped");
            }

            onMessage(event) {
                try {
                    const message = event?.message;
                    if (!message) return;

                    // Only DMs
                    const channel = ChannelStore?.getChannel(event.channelId);
                    if (!channel || channel.type !== 1) return;

                    // Ignore self
                    const currentUser = UserStore?.getCurrentUser();
                    if (!currentUser || message.author?.id === currentUser.id) return;

                    // Trigger command
                    if (message.content?.trim() !== "!urgent") return;

                    this.sendNotification(message, channel);

                } catch (err) {
                    Logger.error("Error handling message", err);
                }
            }

            sendNotification(message, channel) {
                if (!NotificationModule) return;

                try {
                    NotificationModule.showNotification(
                        `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.webp?size=96`,
                        "🚨 URGENT MESSAGE",
                        `From ${message.author.username}`,
                        {
                            notif_type: "MESSAGE_CREATE",
                            channel_id: channel.id,
                            message_id: message.id
                        },
                        {
                            overrideStreamerMode: true,
                            sound: "message1",
                            volume: 0.5,
                            onClick: () => {
                                NavigationUtils?.transitionTo(
                                    `/channels/@me/${channel.id}/${message.id}`
                                );
                            }
                        }
                    );
                } catch (err) {
                    Logger.error("Notification failed", err);
                }
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
```
