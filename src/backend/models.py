from pydantic import BaseModel

class User(BaseModel):

    id: str
    name: str
    email: str
    gpa: float
    program: str
    location: str
    academic_level: str
    financial_need: bool
    extracurriculars: str