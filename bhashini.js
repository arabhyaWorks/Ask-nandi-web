import axios from 'axios';

const axiosApiInstance = axios.create({
  baseURL: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
});

axiosApiInstance.interceptors.request.use(
  async (request) => {
    request.headers.Authorization = 'ZZiuNxfnJBUTWXXZmxQ7Wm6xk-R7vBZaFIZjf7nse8UXe3Oc4r4B_YW9KMgwZI_M';
    return request;
  },
  (err) => Promise.reject(err)
);

const request = async (method, req) => {
  try {
    const response = await axiosApiInstance({
      method,
      url: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
      headers: { Accept: 'application/json' },
      data: req,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('Oops, User session timed out');
    } else {
      throw error.response;
    }
  }
};

export const textToTextTranslationNMT = async (text, targetLanguage) => {
  const reqObj = {
    pipelineTasks: [
      {
        taskType: 'translation',
        config: {
          language: {
            sourceLanguage: 'en', // assuming the source language is always English
            targetLanguage: targetLanguage,
          },
          serviceId: 'ai4bharat/indictrans-v2-all-gpu--t4',
        },
      },
    ],
    inputData: {
      input: [{ source: text }],
    },
  };

  try {
    const responseData = await request('POST', reqObj);
    const translatedText = responseData?.pipelineResponse[0]?.output[0]?.target;

    if (translatedText) {
      return translatedText;
    } else {
      console.error('No translated text found in the response');
      return null;
    }
  } catch (error) {
    console.error('textToTextTranslationNMT error:', error);
    return null;
  }
};