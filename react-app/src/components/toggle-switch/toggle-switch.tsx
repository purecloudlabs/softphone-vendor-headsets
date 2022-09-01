/* istanbul ignore file */
import React from 'react';
import './toggle-switch.css';
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const ToggleSwitch = (props: { checked: boolean, onChange: any, name: string, disabled: boolean }) => {
/* eslint-enable */
  const { checked, onChange, name, disabled } = props;
  return (
    <>
      <input
        checked={checked}
        onChange={onChange}
        className='toggle-switch'
        id={name}
        type='checkbox'
        disabled={disabled}
      />
      <label
        className={`toggle-label ${checked ? 'toggle-on' : 'toggle-off'}`}
        htmlFor={name}
      >
        <span className='toggle-button' />
      </label>
    </>
  );
};

export default ToggleSwitch;