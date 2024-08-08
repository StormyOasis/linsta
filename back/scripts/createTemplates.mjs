import { SESClient } from "@aws-sdk/client-ses";
import { UpdateTemplateCommand, CreateTemplateCommand } from "@aws-sdk/client-ses";
import config from 'config';

const REGION = config.get("aws.region");
const sesClient = new SESClient({ region: REGION });

const CreateConfirmationEmailTemplateCommand = () => {
    const templateName = `sendconfirmemail`;

    const template = new UpdateTemplateCommand({
        Template: {
            TemplateName: templateName,
            SubjectPart: 'Linstagram - Confirm Email',
            HtmlPart:
            `
                <table style="width: 100%; font-size: 18px; font-family: Helvetica Neue, Helvetica, Lucida Grande, tahoma, verdana, arial, sans-serif;">
                    <tr style="width: 100%; text-align: center;">
                        <td style="width: 25%"></td>
                        <td>
                            <img src="{{assetHostname}}/linsta.png" />
                            <hr />
                        </td>
                        <td style="width: 25%"></td>
                    </tr>
                    <tr>
                        <td style="width: 25%"></td>
                        <td style="width:50%; padding-top: 12px;">
                            <div >Hello,</div>
                            <div style="padding-top:28px">Someone tried to sign up for an Linstagram account with this email: {{emailAddress}}. </div>
                            <div style="padding-top:6px">If it was you, please enter this confirmation code on the signup page.</div>
                        </td>
                        <td style="width: 25%"></td>
                    </tr>
                    <tr>
                        <td style="width: 25%"></td>
                        <td style="font-size: 30px; font-weight: 500; text-align: center; padding-top: 32px;">
                            {{code}}
                        </td>         
                        <td style="width: 25%"></td>
                    </tr>
                </table>
                <div style="margin-top:25px; font-size: .75em; text-align:center">
                    This message was sent to {{emailAddress}}
                </div>                 
            `
        }
    });
    return template;
}

const CreateForgotPasswordEmailTemplateCommand = () => {
    const templateName = `forgotpasswordemail`;

    //const template = new CreateTemplateCommand({
    const template = new UpdateTemplateCommand({
        Template: {
            TemplateName: templateName,
            SubjectPart: 'Linstagram - Forgotten Password',
            HtmlPart:
            `
                <table style="width: 100%; font-size: 18px; font-family: Helvetica Neue, Helvetica, Lucida Grande, tahoma, verdana, arial, sans-serif;">
                    <tr style="width: 100%; text-align: center;">
                        <td style="width: 25%"></td>
                        <td>
                            <img src="{{assetHostname}}/linsta.png" />
                            <hr />
                        </td>
                        <td style="width: 25%"></td>
                    </tr>
                    <tr>
                        <td style="width: 25%"></td>
                        <td style="width: 50%; padding-top: 12px;">
                            <div >Hello {{username}},</div>
                            <div style="padding-top:28px">We got a message that you forgot your password. If this was you then you can reset your password using the below link.
                        </td>
                        <td style="width: 25%"></td>
                    </tr>
                    <tr style="height:50px"></tr>                      
                    <tr>
                        <td style="width: 25%"></td>
                        <td style="text-align: center;">
                            <a href="{{hostname}}/change_password?token={{token}}"
                                style="padding: 20px; font-size: 26px; font-weight: 500; border-radius: 8px; text-align: center; background-color: rgb(0, 150, 245); color: white; text-decoration: none;">
                                Reset Password
                            </a>
                        </td>         
                        <td style="width: 25%"></td>
                    </tr>
                    <tr style="height:50px"></tr>                      
                    <tr>
                        <td style="width: 25%"></td>
                        <td style="text-align: center; font-size: .92em;">   
                            <span>If you didn't request a password reset, you can ignore this message.</span>
                        </td>
                        <td style="width: 25%"></td>
                    </tr>
                </table>
                <div style="margin-top:25px; font-size: .75em; text-align:center">
                    This message was sent to {{emailAddress}}
                </div>                         
            `
        }
    });
    return template;
}

const run = async () => {
    const createTemplateCommand = CreateConfirmationEmailTemplateCommand();
    const forgotPasswordTemplateCommand = CreateForgotPasswordEmailTemplateCommand();
    try {
        await sesClient.send(createTemplateCommand);
        await sesClient.send(forgotPasswordTemplateCommand);
    } catch (err) {
        console.log("Failed to create template.", err);
        throw err;
    }
};

run();