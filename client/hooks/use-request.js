import { useState, useEffect } from 'react';
import axios from 'axios';

const useRequest = ({ url, method, body, onSuccess }) => {
  const [errors, setErrors] = useState(null);

  const doRequest = async (props = {}) => {
    try {
      setErrors(null);
      const res = await axios[method](url, { ...body, ...props });

      if (onSuccess) {
        return onSuccess(res.data);
      }

      return res.data;
    } catch (err) {
      const errorMessages = err.response?.data?.errors || [
        { message: 'Something went wrong' },
      ];
      setErrors(
        <div className="alert alert-danger">
          <h4>Oops!!</h4>
          <ul className="my-0">
            {errorMessages.map((e) => (
              <li key={e.message}>{e.message}</li>
            ))}
          </ul>
        </div>
      );
    }
  };

  return { doRequest, errors };
};

export default useRequest;
