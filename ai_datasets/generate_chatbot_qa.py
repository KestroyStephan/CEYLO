import csv

# Realistic Q&A pairs for Sri Lanka tourism
QA_DATA = [
    {"question": "What is the best way to travel from Colombo to Kandy?", "answer": "The most scenic and popular way is by train from Colombo Fort to Kandy. It takes about 2.5 to 3 hours. Alternatively, you can take an AC bus from Bastian Mawatha or hire a private taxi (approx. $40-$50).", "category": "Transport"},
    {"question": "How much does a tuk-tuk cost per kilometer in Sri Lanka?", "answer": "A standard metered tuk-tuk charges around 100-120 LKR for the first kilometer, and 80-100 LKR per kilometer after that. Always ask to use the meter, or negotiate the fare before starting the journey.", "category": "Pricing"},
    {"question": "Is it safe for solo female travelers in Sri Lanka?", "answer": "Yes, Sri Lanka is generally safe for solo female travelers. However, dress modestly (covering shoulders and knees) especially in rural areas or religious sites, avoid isolated beaches at night, and always use reputable transport like PickMe or Uber. Use the CEYLO SOS button if you feel unsafe.", "category": "Safety"},
    {"question": "What should I wear when visiting a Buddhist temple?", "answer": "You must wear clothing that covers your shoulders and knees. Hats and shoes must be removed before entering the sacred areas of the temple.", "category": "Cultural Norms"},
    {"question": "When is the best time to visit the southern beaches like Mirissa and Unawatuna?", "answer": "The best time to visit the South Coast is from late November to April, when the weather is dry and the sea is calm, making it perfect for swimming and whale watching.", "category": "Weather & Seasons"},
    {"question": "What is the emergency police number in Sri Lanka?", "answer": "The emergency police number is 119. For tourist police, you can dial 1912. You can also trigger the CEYLO SOS feature for immediate assistance.", "category": "Emergency"},
    {"question": "Can I drink tap water in Sri Lanka?", "answer": "No, it is not recommended to drink tap water. Always drink bottled, filtered, or boiled water. Check that the seal on bottled water is intact before purchasing.", "category": "Health & Safety"},
    {"question": "How much should I tip in restaurants?", "answer": "A 10% service charge is often included in the bill. If it's not included, leaving a 10% tip is customary and appreciated for good service.", "category": "Cultural Norms & Pricing"},
    {"question": "What is the entry fee for Sigiriya Rock Fortress?", "answer": "As of recent updates, the entry fee for Sigiriya is roughly $30 USD for foreign adults. SAARC country citizens pay roughly $15 USD. You can pay in LKR equivalent or USD at the counter.", "category": "Pricing"},
    {"question": "Are there any eco-friendly ways to see elephants?", "answer": "Yes! Instead of elephant riding or visiting orphanages with chained animals, it is highly recommended to do a jeep safari in Minneriya, Kaudulla, or Udawalawe National Parks where you can observe wild elephants in their natural habitat. Look for high Eco Score operators on CEYLO.", "category": "Eco & Sustainability"},
    {"question": "How do I get a SIM card as a tourist?", "answer": "You can easily buy a tourist SIM card right at the arrival lounge in Bandaranaike International Airport (BIA). Dialog and Mobitel offer good island-wide coverage. You will need your passport to register.", "category": "General Info"},
    {"question": "What is a 'Poya' day?", "answer": "A Poya day is a Buddhist public holiday in Sri Lanka that occurs every full moon. On these days, the sale of alcohol and meat is strictly prohibited, and many businesses may be closed.", "category": "Cultural Norms"},
    {"question": "How do I avoid plastic waste during my trip?", "answer": "Carry a reusable water bottle (many hotels offer filtered water refills), refuse plastic straws with king coconuts, and bring a reusable tote bag for shopping. CEYLO highlights vendors with strict zero-plastic policies.", "category": "Eco & Sustainability"},
    {"question": "What are the common symptoms of dengue and how to avoid it?", "answer": "Symptoms include sudden high fever, severe headache, joint/muscle pain, and a rash. To avoid dengue, use mosquito repellent containing DEET, wear long sleeves during dawn and dusk, and sleep under a mosquito net.", "category": "Health & Safety"},
    {"question": "Is Uber available in Sri Lanka?", "answer": "Yes, Uber is available in Colombo and some major tourist hubs. 'PickMe' is the local equivalent and is widely used across the island for tuk-tuks, cars, and food delivery.", "category": "Transport"}
]

def generate_qa_dataset():
    # We will generate a base set. A larger system would expand this to 500+ using generative AI.
    # For now, we save these core 15 highly realistic, high-quality pairs.
    print(f"Generating Chatbot Q&A dataset with {len(QA_DATA)} pairs...")
    
    with open('chatbot_qa.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['question', 'answer', 'category'])
        writer.writeheader()
        writer.writerows(QA_DATA)
        
    print("Saved chatbot_qa.csv")

if __name__ == "__main__":
    generate_qa_dataset()
