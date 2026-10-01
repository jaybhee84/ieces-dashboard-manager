const sections = [
  {
    id: "signing-in",
    title: "Signing in and creating your account",
    items: [
      {
        task: "Create your administrator account",
        steps: [
          "Ask the system owner to add your email to the dashboard's allowed list first.",
          "On the login screen, choose Create account.",
          "Enter your email, a username, your name, then your password twice.",
          "Use the eye button to check what you typed, then choose Register.",
        ],
      },
      {
        task: "Sign in",
        steps: [
          "Type your username or your email, then your password.",
          "Choose Login. You are asked to sign in again each time the app is opened.",
        ],
      },
      {
        task: "Sign out",
        steps: ["Use the sign-out button beside your name at the bottom of the sidebar."],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Reading the dashboard",
    items: [
      {
        task: "Check overall activity",
        steps: [
          "Managed apps, Online now and Total users summarise all IECES applications.",
          "Each application card shows how many users are registered and how many are online.",
          "Counts update on their own every few seconds. Choose Refresh data to update immediately.",
        ],
      },
      {
        task: "Open an application",
        steps: [
          "Select a card (IECES Report, IECES Portal or News Manager) to manage its users.",
          "Choose ← Applications, or Dashboard in the sidebar, to go back.",
        ],
      },
    ],
  },
  {
    id: "allowing",
    title: "Allowing people to register",
    items: [
      {
        task: "Allow a new user",
        steps: [
          "Open the application the person needs.",
          "Under Allowed emails, type their email address and choose Allow.",
          "Tell the person they can now create their account inside that application.",
        ],
        note: "Each application has its own list. Allowing an email in one application does not allow it in the others.",
      },
      {
        task: "Stop an email from registering",
        steps: [
          "Choose Remove beside the email.",
        ],
        note: "Removing an email only blocks new registration. If the person already has an account, delete or disable the account as well.",
      },
    ],
  },
  {
    id: "account-help",
    title: "Fixing account problems",
    intro:
      "Open the application, find the person under Registered users, and choose Account help. The panel shows when they last signed in, whether their email is confirmed and whether sign-in is enabled.",
    items: [
      {
        task: "The user forgot their password",
        steps: [
          "Choose Send reset email. The user opens the email and sets a new password.",
        ],
      },
      {
        task: "The user does not receive the reset email",
        steps: [
          "Type a temporary password, or choose Generate.",
          "Choose Set password, then give the password to the user directly.",
          "Ask the user to change it after signing in.",
        ],
      },
      {
        task: "The user registered but cannot sign in",
        steps: [
          "If Email shows Not confirmed, choose Confirm email.",
          "If Sign-in shows Disabled, choose Enable sign-in.",
        ],
      },
      {
        task: "Block a user without deleting them",
        steps: [
          "Choose Disable sign-in. Choose Enable sign-in later to restore access.",
        ],
        note: "A user who is already signed in may stay signed in for up to an hour.",
      },
    ],
    footer:
      "All IECES applications share one login. A password change or a disabled sign-in applies to that person in every application.",
  },
  {
    id: "deleting",
    title: "Deleting an account",
    items: [
      {
        task: "Delete a user",
        steps: [
          "Choose Delete beside the user, then confirm with the red Delete button.",
          "Choose Cancel if you selected the wrong person.",
        ],
        note: "Deleting cannot be undone. If the person also uses another IECES application, only their profile in this application is removed and their login is kept.",
      },
    ],
  },
  {
    id: "updates",
    title: "Updating the app",
    items: [
      {
        task: "Get the latest version",
        steps: [
          "Choose Check Updates in the sidebar, or Help → Check for Updates.",
          "If an update is found it downloads by itself. Choose Restart and Install when asked.",
        ],
      },
    ],
  },
];

const ownerSection = {
  id: "owner",
  title: "For the system owner",
  items: [
    {
      task: "Give someone administrator access to this dashboard",
      steps: [
        "Open Allowed Emails in the sidebar. Only the owner sees this page.",
        "Add the person's email, then ask them to create their account from the login screen.",
        "They become a manager: they can allow users, fix account problems and delete accounts.",
      ],
      note: "Managers cannot see Allowed Emails and cannot change or delete the owner's account.",
    },
  ],
};

export default function GuidePage({ isOwner }) {
  const visible = isOwner ? [...sections, ownerSection] : sections;

  return (
    <section className="guide-view">
      <header className="guide-header">
        <p className="eyebrow">Help</p>
        <h2>User Guide</h2>
        <p>How to do each task in the IECES Admin Dashboard.</p>
      </header>

      <div className="guide-layout">
        <nav className="guide-toc" aria-label="Guide sections">
          {visible.map((section) => (
            <a key={section.id} href={`#guide-${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>

        <div className="guide-body">
          {visible.map((section) => (
            <article
              className="guide-section"
              id={`guide-${section.id}`}
              key={section.id}
            >
              <h3>{section.title}</h3>
              {section.intro && <p className="guide-intro">{section.intro}</p>}
              {section.items.map((item) => (
                <div className="guide-item" key={item.task}>
                  <h4>{item.task}</h4>
                  <ol>
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {item.note && <p className="guide-note">{item.note}</p>}
                </div>
              ))}
              {section.footer && <p className="guide-note">{section.footer}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
