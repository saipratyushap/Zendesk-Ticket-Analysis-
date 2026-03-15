const { processTicket } = require('./ai');

const ticket = {
    "output": {
        "item_1": "This is a follow-up to your previous request #9447 \"Re: MB77 offlline - Berry G...\"  \n Yes MB77 both sensors are online now. You may close the ticket. Thanks.\n \n &nbsp; \n\n\n\n\n  \n\n\n Salman\n\n\nRehan\n \n Senior Enterprise Account Manager \n +1 908 553 1267\n\nsare@factbird.com\n\nfactbird.com\n \n\n\n\n\n \n \n \n\n\n\n\n Factbird&nbsp;Inc.&nbsp;1&nbsp;High&nbsp;Street&nbsp;Court,&nbsp;Suite&nbsp;2,&nbsp;Morristown,&nbsp;NJ&nbsp;07960,&nbsp;USA\n \n\n\n\n\n \n\nBook a meeting&nbsp;|&nbsp;My\n LinkedIn\n\n\n\n \n \n \n \n \n From:\nSupport <support@factbird.com>\n\nDate: Tuesday, December 24, 2024 at 5:05\u202fAM\n\nTo: Salman Rehan <sare@factbird.com>\n\nCc: Mike Campbell <mikecampbell@berryglobal.com>, Molom-Ochir Mijid <molom-ochirmijid@berryglobal.com>, Mihir Sanghavi <mihirsanghavi@berryglobal.com>, John Schweizer <johnschweizer@berryglobal.com>\n\nSubject: [Factbird] Pending request: Re: MB77 offlline - Berry Global issue",
        "item_last": "This is a follow-up to your previous request #9447 \"Re: MB77 offlline - Berry G...\"  \n Yes MB77 both sensors are online now. You may close the ticket. Thanks.\n \n &nbsp; \n\n\n\n\n  \n\n\n Salman\n\n\nRehan\n \n Senior Enterprise Account Manager \n +1 908 553 1267\n\nsare@factbird.com\n\nfactbird.com\n \n\n\n\n\n \n \n \n\n\n\n\n Factbird&nbsp;Inc.&nbsp;1&nbsp;High&nbsp;Street&nbsp;Court,&nbsp;Suite&nbsp;2,&nbsp;Morristown,&nbsp;NJ&nbsp;07960,&nbsp;USA\n \n\n\n\n\n \n\nBook a meeting&nbsp;|&nbsp;My\n LinkedIn\n\n\n\n \n \n \n \n \n From:\nSupport <support@factbird.com>\n\nDate: Tuesday, December 24, 2024 at 5:05\u202fAM\n\nTo: Salman Rehan <sare@factbird.com>\n\nCc: Mike Campbell <mikecampbell@berryglobal.com>, Molom-Ochir Mijid <molom-ochirmijid@berryglobal.com>, Mihir Sanghavi <mihirsanghavi@berryglobal.com>, John Schweizer <johnschweizer@berryglobal.com>\n\nSubject: [Factbird] Pending request: Re: MB77 offlline - Berry Global issue",
        "text": "This is a follow-up to your previous request #9447 \"Re: MB77 offlline - Berry G...\"  \n Yes MB77 both sensors are online now. You may close the ticket. Thanks.\n \n &nbsp; \n\n\n\n\n  \n\n\n Salman\n\n\nRehan\n \n Senior Enterprise Account Manager \n +1 908 553 1267\n\nsare@factbird.com\n\nfactbird.com\n \n\n\n\n\n \n \n \n\n\n\n\n Factbird&nbsp;Inc.&nbsp;1&nbsp;High&nbsp;Street&nbsp;Court,&nbsp;Suite&nbsp;2,&nbsp;Morristown,&nbsp;NJ&nbsp;07960,&nbsp;USA\n \n\n\n\n\n \n\nBook a meeting&nbsp;|&nbsp;My\n LinkedIn\n\n\n\n \n \n \n \n \n From:\nSupport <support@factbird.com>\n\nDate: Tuesday, December 24, 2024 at 5:05\u202fAM\n\nTo: Salman Rehan <sare@factbird.com>\n\nCc: Mike Campbell <mikecampbell@berryglobal.com>, Molom-Ochir Mijid <molom-ochirmijid@berryglobal.com>, Mihir Sanghavi <mihirsanghavi@berryglobal.com>, John Schweizer <johnschweizer@berryglobal.com>\n\nSubject: [Factbird] Pending request: Re: MB77 offlline - Berry Global issue"
    }
};

async function reproduce() {
    const problem = ticket.output.item_1 || ticket.output.text;
    const solution = ticket.output.item_last || ticket.output.item_2 || "Resolution in progress; support is currently investigating.";
    const email = "sare@factbird.com";

    console.log("--- REPRODUCTION START ---");
    console.log("Input Problem (length):", problem.length);
    console.log("Input Solution (length):", solution.length);

    const result = await processTicket(problem, solution, email);
    
    console.log("\n--- PROCESSING RESULT ---");
    console.log(JSON.stringify(result, null, 2));
}

reproduce();
