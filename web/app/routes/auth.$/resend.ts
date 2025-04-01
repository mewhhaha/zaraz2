export const createResend = (apiKey: string) => {
  const send = async ({
    from,
    to,
    subject,
    html,
  }: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to send email, status: ${response.status}, message: ${await response.text()}`,
      );
      throw new Error("Failed to send email");
    }

    return response.json<{ id: string }>();
  };

  return { send };
};
