from openai import OpenAI

client = OpenAI(
    base_url="https://kiraai.vn/api/v1",
    api_key="kira_1869599bfab29f444d7b112bef91ce87"
)

response = client.chat.completions.create(
    model="mimo-v2.5-free",
    messages=[
        {"role": "system", "content": "là 1 des và dev"},
        {"role": "user", "content": "giới thiệu bản thân"}
    ]
)

print(response.choices[0].message.content)