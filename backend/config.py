from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_api_key: str = ""
    llm_base_url: str = "https://open.bigmodel.cn/api/paas/v4/"
    llm_model: str = "glm-5"
    database_url: str = "sqlite:///./emgai.db"

    model_config = {"env_file": ".env"}


settings = Settings()
